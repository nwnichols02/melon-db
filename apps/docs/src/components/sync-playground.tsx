import {
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
	type ApplyRemoteChangesOptions,
} from "@melon/db";
import { createReactiveDevtoolsBridge } from "@melon/db-devtools";
import {
	MelonDevtoolsPanel,
	MelonDevtoolsProvider,
} from "@melon/db-devtools/react";
import { MelonDbProvider } from "@melon/db-react";
import {
	createMemoryCheckpointStore,
	synchronize,
	type PullArgs,
	type PullResult,
	type PushArgs,
} from "@melon/sync";
import { InMemorySyncStore } from "@melon/sync-server";
import { useCallback, useMemo, useState, type ReactElement } from "react";

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
				<div
					style={{
						background: "#fff",
						border: "1px solid #ddd",
						borderRadius: 12,
						padding: 20,
					}}
				>
					<h2 style={{ marginTop: 0 }}>Sync playground</h2>
					<p style={{ color: "#666" }}>
						Creates a local task, pushes to an in-memory reference server, then
						pulls on a second checkpoint. Check the Sync tab in devtools for
						retry events when flaky network is enabled.
					</p>
					<div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
						<label style={{ display: "flex", alignItems: "center", gap: 6 }}>
							<input
								checked={flakyNetwork}
								onChange={(event) => setFlakyNetwork(event.target.checked)}
								type="checkbox"
							/>
							Flaky network (fail 2 pulls)
						</label>
						<label style={{ display: "flex", alignItems: "center", gap: 6 }}>
							Conflict policy
							<select
								onChange={(event) =>
									setConflictPolicy(
										event.target.value as ApplyRemoteChangesOptions["conflictPolicy"],
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
					<button
						onClick={() => void seedAndSync()}
						style={{
							background: "#111",
							border: "none",
							borderRadius: 6,
							color: "#fff",
							cursor: "pointer",
							padding: "8px 16px",
						}}
						type="button"
					>
						Seed + sync
					</button>
					<p style={{ color: "#666", marginTop: 12 }}>{status}</p>
				</div>
				<MelonDevtoolsPanel />
			</MelonDevtoolsProvider>
		</MelonDbProvider>
	);
}
