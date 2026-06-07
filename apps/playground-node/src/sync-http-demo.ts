import {
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
} from "@melon-db/db";
import {
	createMemoryCheckpointStore,
	synchronize,
	type PullArgs,
	type PullResult,
	type PushArgs,
} from "@melon-db/sync";
import { createSyncHttpServer } from "@melon-db/sync-server";

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

function createHttpBackend(baseUrl: string) {
	return {
		pullChanges: async (args: PullArgs): Promise<PullResult> => {
			const response = await fetch(`${baseUrl}/sync/pull`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(args),
			});
			if (!response.ok) {
				throw new Error(`Pull failed: ${response.status}`);
			}
			return response.json() as Promise<PullResult>;
		},
		pushChanges: async (args: PushArgs): Promise<void> => {
			const response = await fetch(`${baseUrl}/sync/push`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(args),
			});
			if (!response.ok) {
				throw new Error(`Push failed: ${response.status}`);
			}
		},
	};
}

function createSyncClient(baseUrl: string) {
	const db = createDatabase({
		schema: syncSchema,
		adapter: createInMemoryAdapter(),
		sync: {},
	});

	const backend = createHttpBackend(baseUrl);

	return {
		db,
		sync: () =>
			synchronize({
				db,
				...backend,
				checkpointStore: createMemoryCheckpointStore(),
			}),
	};
}

const { url, stop } = createSyncHttpServer({ port: 8788 });

try {
	const clientA = createSyncClient(url);
	const clientB = createSyncClient(url);

	console.log("=== Melon HTTP sync demo ===\n");
	console.log(`Server: ${url}\n`);

	await clientA.db.write(async (tx) => {
		await tx.collection("tasks").insert({
			id: "1",
			title: "Learn @melon-db/sync-server",
			status: "open",
		});
	});

	console.log("Client A: created task locally");
	await clientA.sync();
	console.log("Client A: synced over HTTP");

	await clientB.sync();
	console.log("Client B: synced over HTTP");

	const taskOnB = await clientB.db.collection("tasks").findById("1");
	console.log(`\nClient B sees: "${taskOnB?.title}" (${taskOnB?.status})`);
	console.log("\nDone.");
} finally {
	stop();
}
