import {
	type ApplyRemoteChangesOptions,
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
} from "@melon/db";
import { createReactiveDevtoolsBridge } from "@melon/db-devtools";
import {
	MelonDevtoolsPanel,
	MelonDevtoolsProvider,
} from "@melon/db-devtools/react";
import { MelonDbProvider } from "@melon/db-react";
import {
	type PullArgs,
	type PullResult,
	type PushArgs,
	createMemoryCheckpointStore,
	synchronize,
} from "@melon/sync";
import { InMemorySyncStore } from "@melon/sync-server/in-memory";
import { type ReactElement, useCallback, useMemo, useState } from "react";

const syncSchema = createMelonSchema({
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				title: { kind: "string" },
				status: { kind: "string" },
			},
		},
	},
});

const bridge = createReactiveDevtoolsBridge();
const db = createDatabase({
	schema: syncSchema,
	adapter: createInMemoryAdapter(),
	devtools: bridge,
	sync: {},
});

const server = new InMemorySyncStore({
	collection: "tasks",
	primaryKey: "id",
});

const CONFLICT_OPTIONS: Array<{
	label: string;
	value: ApplyRemoteChangesOptions["conflictPolicy"];
}> = [
	{ label: "Server wins", value: "server-wins" },
	{ label: "Client wins", value: "client-wins" },
	{ label: "Last write wins", value: "last-write-wins" },
	{ label: "Merge by field", value: "merge-by-field" },
];

/**
 * Two-client sync demo with devtools sync event logging.
 */
export function SyncPlayground(): ReactElement {
	const checkpointA = useMemo(() => createMemoryCheckpointStore(), []);
	const checkpointB = useMemo(() => createMemoryCheckpointStore(), []);
	const [status, setStatus] = useState("Idle");
	const [flakyNetwork, setFlakyNetwork] = useState(false);
	const [conflictPolicy, setConflictPolicy] =
		useState<ApplyRemoteChangesOptions["conflictPolicy"]>("server-wins");
	const flakyRef = useMemo(() => ({ remainingFailures: 0 }), []);

	const syncClient = useCallback(
		async (
			label: "A" | "B",
			checkpoint: ReturnType<typeof createMemoryCheckpointStore>,
		) => {
			setStatus(`Syncing client ${label}…`);
			let pullCalls = 0;
			await synchronize({
				db,
				checkpointStore: checkpoint,
				conflictPolicy,
				retryPolicy: {
					maxAttempts: 3,
					baseDelayMs: 50,
					maxDelayMs: 100,
					jitter: false,
				},
				pullChanges: async (args: PullArgs): Promise<PullResult> => {
					pullCalls += 1;
					if (flakyNetwork && flakyRef.remainingFailures > 0) {
						flakyRef.remainingFailures -= 1;
						throw new Error("simulated flaky network");
					}
					return server.pullChanges(args);
				},
				pushChanges: (args: PushArgs) => server.pushChanges(args),
				onSyncEvent: bridge.emitSync?.bind(bridge),
			});
			setStatus(`Client ${label} synced (${pullCalls} pull attempt(s))`);
		},
		[conflictPolicy, flakyNetwork, flakyRef],
	);

	const runMergeDemo = useCallback(async () => {
		setStatus("Running merge-by-field demo…");
		const mergeId = "merge-demo";
		await db.write(async (tx) => {
			const existing = await tx.collection("tasks").findById(mergeId);
			if (!existing) {
				await tx.collection("tasks").insert({
					id: mergeId,
					title: "Baseline",
					status: "open",
				});
			}
		});
		await db.markLocalChangesPushed();
		await db.write(async (tx) => {
			await tx.collection("tasks").update(mergeId, { title: "Local title" });
		});
		await db.applyRemoteChanges(
			{
				tasks: {
					created: [],
					updated: [{ id: mergeId, title: "Remote title", status: "done" }],
					deleted: [],
				},
			},
			{ conflictPolicy: "merge-by-field" },
		);
		const row = await db.collection("tasks").findById(mergeId);
		setStatus(
			`Merged row: ${JSON.stringify(row)} (local title + remote status)`,
		);
	}, []);

	const seedAndSync = useCallback(async () => {
		if (flakyNetwork) {
			flakyRef.remainingFailures = 2;
		}
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: crypto.randomUUID(),
				title: `Task from browser ${Date.now()}`,
				status: "open",
			});
		});
		await syncClient("A", checkpointA);
		await syncClient("B", checkpointB);
	}, [checkpointA, checkpointB, syncClient, flakyNetwork, flakyRef]);

	return (
		<MelonDbProvider db={db}>
			<MelonDevtoolsProvider bridge={bridge}>
				<div className="rounded-xl border border-fd-border bg-fd-card p-5">
					<h2 className="mt-0 text-xl font-semibold">Sync playground</h2>
					<p className="text-fd-muted-foreground">
						Creates a local task, pushes to an in-memory reference server, then
						pulls on a second checkpoint. Check the Sync tab in devtools for
						retry events when flaky network is enabled.
					</p>
					<div className="mb-3 flex flex-wrap gap-4">
						<label className="flex items-center gap-2">
							<input
								checked={flakyNetwork}
								onChange={(event) => setFlakyNetwork(event.target.checked)}
								type="checkbox"
							/>
							Flaky network (fail 2 pulls)
						</label>
						<label className="flex items-center gap-2">
							Conflict policy
							<select
								className="rounded-md border border-fd-border px-2 py-1"
								onChange={(event) =>
									setConflictPolicy(
										event.target
											.value as ApplyRemoteChangesOptions["conflictPolicy"],
									)
								}
								value={conflictPolicy}
							>
								{CONFLICT_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							className="rounded-md bg-fd-primary px-4 py-2 text-fd-primary-foreground"
							onClick={() => void seedAndSync()}
							type="button"
						>
							Seed + sync
						</button>
						<button
							className="rounded-md bg-fd-secondary px-4 py-2"
							onClick={() => void runMergeDemo()}
							type="button"
						>
							Merge-by-field demo
						</button>
					</div>
					<p className="mt-3 text-fd-muted-foreground">{status}</p>
				</div>
				<MelonDevtoolsPanel />
			</MelonDevtoolsProvider>
		</MelonDbProvider>
	);
}
