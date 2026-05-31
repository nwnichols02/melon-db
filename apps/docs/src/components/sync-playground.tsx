import {
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

/**
 * Two-client sync demo with devtools sync event logging.
 */
export function SyncPlayground(): ReactElement {
	const checkpointA = useMemo(() => createMemoryCheckpointStore(), []);
	const checkpointB = useMemo(() => createMemoryCheckpointStore(), []);
	const [status, setStatus] = useState("Idle");

	const syncClient = useCallback(
		async (label: "A" | "B", checkpoint: ReturnType<typeof createMemoryCheckpointStore>) => {
			setStatus(`Syncing client ${label}…`);
			await synchronize({
				db,
				checkpointStore: checkpoint,
				pullChanges: (args: PullArgs) => server.pullChanges(args),
				pushChanges: (args: PushArgs) => server.pushChanges(args),
				onSyncEvent: bridge.emitSync?.bind(bridge),
			});
			setStatus(`Client ${label} synced`);
		},
		[],
	);

	const seedAndSync = useCallback(async () => {
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: crypto.randomUUID(),
				title: `Task from browser ${Date.now()}`,
				status: "open",
			});
		});
		await syncClient("A", checkpointA);
		await syncClient("B", checkpointB);
	}, [checkpointA, checkpointB, syncClient]);

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
						pulls on a second checkpoint. Check the Sync tab in devtools.
					</p>
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
