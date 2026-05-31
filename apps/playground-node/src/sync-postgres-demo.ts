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
import {
	createPostgresSyncStore,
	createSyncHttpServer,
} from "@melon/sync-server";

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

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	console.error("Missing DATABASE_URL.");
	console.error("Start Postgres with: bun run postgres:up");
	console.error("Then run: bun run demo:sync:postgres");
	process.exit(1);
}

async function runDemo(): Promise<void> {
	const store = await createPostgresSyncStore(databaseUrl);
	const { url, stop: stopFirst } = createSyncHttpServer({ port: 8789, store });

	try {
		const clientA = createSyncClient(url);
		const clientB = createSyncClient(url);

		console.log("=== Melon Postgres sync demo ===\n");
		console.log(`Server: ${url}`);
		console.log(`Database: ${databaseUrl}\n`);

		await clientA.db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "pg-1",
				title: "Persist in Postgres",
				status: "open",
			});
		});

		console.log("Client A: created task locally");
		await clientA.sync();
		console.log("Client A: synced over HTTP to Postgres");

		await clientB.sync();
		console.log("Client B: synced over HTTP from Postgres");

		const taskOnB = await clientB.db.collection("tasks").findById("pg-1");
		console.log(`\nClient B sees: "${taskOnB?.title}" (${taskOnB?.status})`);
	} finally {
		stopFirst();
	}

	const storeAfterRestart = await createPostgresSyncStore(databaseUrl);
	const { url: url2, stop: stopSecond } = createSyncHttpServer({
		port: 8790,
		store: storeAfterRestart,
	});

	try {
		const clientC = createSyncClient(url2);
		await clientC.sync();
		const taskAfterRestart = await clientC.db
			.collection("tasks")
			.findById("pg-1");
		console.log(
			`\nAfter server restart, Client C sees: "${taskAfterRestart?.title}"`,
		);
		console.log("\nDone.");
	} finally {
		stopSecond();
	}
}

await runDemo();
