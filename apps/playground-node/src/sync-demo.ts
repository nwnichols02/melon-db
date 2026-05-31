import {
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
} from "@melon/db";
import {
	createMemoryCheckpointStore,
	synchronize,
	type PullArgs,
	type PullResult,
	type PushArgs,
} from "@melon/sync";

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

/** Minimal in-memory server for the sync demo. */
function createDemoServer() {
	const records = new Map<string, Record<string, unknown>>();
	let timestamp = 1;

	return {
		async pullChanges(args: PullArgs): Promise<PullResult> {
			timestamp += 1;
			if ((args.lastPulledAt ?? 0) === 0) {
				return {
					changes: {
						tasks: {
							created: [...records.values()],
							updated: [],
							deleted: [],
						},
					},
					timestamp,
				};
			}
			return {
				changes: { tasks: { created: [], updated: [], deleted: [] } },
				timestamp,
			};
		},
		async pushChanges(args: PushArgs): Promise<void> {
			const changeSet = args.changes.tasks;
			if (!changeSet) return;
			for (const record of changeSet.created) {
				records.set(String(record.id), { ...record });
			}
			for (const record of changeSet.updated) {
				records.set(String(record.id), { ...record });
			}
			for (const id of changeSet.deleted) {
				records.delete(id);
			}
		},
	};
}

function createSyncClient(server: ReturnType<typeof createDemoServer>) {
	const db = createDatabase({
		schema: syncSchema,
		adapter: createInMemoryAdapter(),
		sync: {},
	});

	return {
		db,
		sync: () =>
			synchronize({
				db,
				pullChanges: (args) => server.pullChanges(args),
				pushChanges: (args) => server.pushChanges(args),
				checkpointStore: createMemoryCheckpointStore(),
			}),
	};
}

const server = createDemoServer();
const clientA = createSyncClient(server);
const clientB = createSyncClient(server);

console.log("=== Melon sync demo ===\n");

await clientA.db.write(async (tx) => {
	await tx.collection("tasks").insert({
		id: "1",
		title: "Learn @melon/sync",
		status: "open",
	});
});

console.log("Client A: created task locally");
await clientA.sync();
console.log("Client A: synced (pushed to mock server)");

await clientB.sync();
console.log("Client B: synced (pulled from mock server)");

const taskOnB = await clientB.db.collection("tasks").findById("1");
console.log(`\nClient B sees: "${taskOnB?.title}" (${taskOnB?.status})`);
console.log("\nDone.");
