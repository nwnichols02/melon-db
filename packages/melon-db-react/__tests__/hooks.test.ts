import { describe, expect, test } from "bun:test";
import {
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
	predicate,
	prepareQuery,
	queryAst,
} from "@melon/db";
import { compilePrismaQuery } from "@melon/db-prisma";
import { createMangoCompiler } from "@melon/db-query-mango";
import {
	SyncStatusKind,
	createMemoryCheckpointStore,
	synchronize,
} from "@melon/sync";
import { InMemorySyncStore } from "@melon/sync-server";

const mangoCompiler = createMangoCompiler();

async function observePrepared(
	db: ReturnType<typeof createDatabase>,
	prepared: ReturnType<typeof compilePrismaQuery>,
): Promise<number[]> {
	const updates: number[] = [];
	const handle = db.collection(prepared.ast.collection).query(prepared.ast);
	handle.observe((rows) => updates.push(rows.length));
	await new Promise((r) => setTimeout(r, 5));
	return updates;
}

// Hook logic tested via observe contract (React DOM tests omitted in Bun package)
describe("db-react exports", () => {
	test("database query observe matches hook contract", async () => {
		const schema = createMelonSchema({
			version: 1,
			collections: {
				tasks: {
					name: "tasks",
					primaryKey: "id",
					fields: { id: { kind: "string" }, status: { kind: "string" } },
				},
			},
		});
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		const updates: number[] = [];
		const handle = db.collection("tasks").query(queryAst("tasks", {}));
		handle.observe((rows) => updates.push(rows.length));
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({ id: "1", status: "open" });
		});
		await new Promise((r) => setTimeout(r, 15));
		expect(updates.length).toBeGreaterThanOrEqual(2);
		expect(updates.at(-1)).toBe(1);
	});

	test("useFindMany observe contract via compilePrismaQuery", async () => {
		const schema = createMelonSchema({
			version: 1,
			collections: {
				tasks: {
					name: "tasks",
					primaryKey: "id",
					fields: {
						id: { kind: "string" },
						status: { kind: "string" },
					},
				},
			},
		});
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		const prepared = compilePrismaQuery(
			"tasks",
			{ where: { status: "open" } },
			schema,
		);
		const updates = await observePrepared(db, prepared);
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({ id: "1", status: "open" });
		});
		await new Promise((r) => setTimeout(r, 15));
		expect(updates.length).toBeGreaterThanOrEqual(2);
		expect(updates.at(-1)).toBe(1);
	});

	test("useRecord observe contract via primary-key query", async () => {
		const schema = createMelonSchema({
			version: 1,
			collections: {
				tasks: {
					name: "tasks",
					primaryKey: "id",
					fields: {
						id: { kind: "string" },
						status: { kind: "string" },
					},
				},
			},
		});
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		const prepared = prepareQuery(
			{
				collection: "tasks",
				mode: "one",
				where: predicate("id", "eq", "1"),
				limit: 1,
			},
			schema,
		);
		const updates: Array<string | null> = [];
		const handle = db.collection("tasks").query(prepared.ast);
		handle.observe((rows) =>
			updates.push(
				(rows[0] as { status?: string } | undefined)?.status ?? null,
			),
		);
		await new Promise((r) => setTimeout(r, 5));
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({ id: "1", status: "open" });
		});
		await new Promise((r) => setTimeout(r, 15));
		expect(updates.at(-1)).toBe("open");
		await db.write(async (tx) => {
			await tx.collection("tasks").update("1", { status: "done" });
		});
		await new Promise((r) => setTimeout(r, 15));
		expect(updates.at(-1)).toBe("done");
	});

	test("query state contract: fetch then observe updates", async () => {
		const schema = createMelonSchema({
			version: 1,
			collections: {
				tasks: {
					name: "tasks",
					primaryKey: "id",
					fields: {
						id: { kind: "string" },
						status: { kind: "string" },
					},
				},
			},
		});
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		const prepared = prepareQuery(queryAst("tasks", {}), schema);
		const handle = db.collection("tasks").query(prepared.ast);
		const lengths: number[] = [];
		await handle.fetch().then((rows) => lengths.push(rows.length));
		handle.observe((rows) => lengths.push(rows.length));
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({ id: "1", status: "open" });
		});
		await new Promise((r) => setTimeout(r, 15));
		expect(lengths[0]).toBe(0);
		expect(lengths.at(-1)).toBe(1);
	});

	test("mango list + record-by-id observe without runaway notifications", async () => {
		const schema = createMelonSchema({
			version: 1,
			collections: {
				tasks: {
					name: "tasks",
					primaryKey: "id",
					fields: {
						id: { kind: "string" },
						status: { kind: "string" },
						priority: { kind: "number" },
					},
				},
			},
		});
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		const listPrepared = mangoCompiler.compile(
			{
				selector: { status: "open" },
				sort: [{ priority: "desc" }],
				limit: 5,
			},
			"tasks",
			schema,
		);
		const listUpdates: number[] = [];
		const listHandle = db.collection("tasks").query(listPrepared.ast);
		listHandle.observe((rows) => listUpdates.push(rows.length));

		const recordPrepared = prepareQuery(
			{
				collection: "tasks",
				mode: "one",
				where: predicate("id", "eq", "1"),
				limit: 1,
			},
			schema,
		);
		const recordUpdates: Array<string | null> = [];
		const recordHandle = db.collection("tasks").query(recordPrepared.ast);
		recordHandle.observe((rows) =>
			recordUpdates.push(
				(rows[0] as { status?: string } | undefined)?.status ?? null,
			),
		);

		await new Promise((r) => setTimeout(r, 5));
		const listCountAfterSubscribe = listUpdates.length;
		const recordCountAfterSubscribe = recordUpdates.length;

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				status: "open",
				priority: 2,
			});
		});
		await new Promise((r) => setTimeout(r, 15));

		expect(listUpdates.length).toBeGreaterThan(listCountAfterSubscribe);
		expect(recordUpdates.length).toBeGreaterThan(recordCountAfterSubscribe);
		expect(listUpdates.length).toBeLessThan(20);
		expect(recordUpdates.length).toBeLessThan(20);
	});

	test("useMangoQuery observe contract via mango compiler", async () => {
		const schema = createMelonSchema({
			version: 1,
			collections: {
				tasks: {
					name: "tasks",
					primaryKey: "id",
					fields: {
						id: { kind: "string" },
						status: { kind: "string" },
					},
				},
			},
		});
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		const prepared = mangoCompiler.compile(
			{ selector: { status: { $eq: "open" } } },
			"tasks",
			schema,
		);
		const updates = await observePrepared(db, prepared);
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({ id: "1", status: "open" });
		});
		await new Promise((r) => setTimeout(r, 15));
		expect(updates.length).toBeGreaterThanOrEqual(2);
		expect(updates.at(-1)).toBe(1);
	});

	test("useSync contract: pull/push cycle updates status", async () => {
		const schema = createMelonSchema({
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
		const server = new InMemorySyncStore();
		const db = createDatabase({
			schema,
			adapter: createInMemoryAdapter(),
			sync: {},
		});
		const statuses: string[] = [];

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Hook sync",
				status: "open",
			});
		});

		await synchronize({
			db,
			pullChanges: (args) => server.pullChanges(args),
			pushChanges: (args) => server.pushChanges(args),
			checkpointStore: createMemoryCheckpointStore(),
			retryPolicy: false,
			onStatusChange: (status) => statuses.push(status.status),
		});

		expect(statuses).toContain(SyncStatusKind.Pulling);
		expect(statuses).toContain(SyncStatusKind.Pushing);
		expect(statuses).toContain(SyncStatusKind.Complete);
		expect(server.getRecord("1")?.title).toBe("Hook sync");
	});

	test("useSync contract: push failure preserves checkpoint", async () => {
		const schema = createMelonSchema({
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
		const server = new InMemorySyncStore();
		const checkpoint = createMemoryCheckpointStore();
		const db = createDatabase({
			schema,
			adapter: createInMemoryAdapter(),
			sync: {},
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Fail push",
				status: "open",
			});
		});

		try {
			await synchronize({
				db,
				pullChanges: (args) => server.pullChanges(args),
				pushChanges: async () => {
					throw new Error("network down");
				},
				checkpointStore: checkpoint,
				retryPolicy: false,
			});
			expect.unreachable();
		} catch {
			// expected
		}

		expect(await checkpoint.getLastPulledAt()).toBeNull();
	});

	test("offline monitor contract surfaces paused status", async () => {
		const schema = createMelonSchema({
			version: 1,
			collections: {
				tasks: {
					name: "tasks",
					primaryKey: "id",
					fields: { id: { kind: "string" }, title: { kind: "string" } },
				},
			},
		});
		const db = createDatabase({
			schema,
			adapter: createInMemoryAdapter(),
			sync: {},
		});
		const { createMutableNetworkMonitor } = await import("@melon/sync");
		const monitor = createMutableNetworkMonitor(false);
		const statuses: string[] = [];

		await expect(
			synchronize({
				db,
				pullChanges: async () => ({
					changes: {},
					timestamp: 1,
				}),
				pushChanges: async () => {},
				checkpointStore: createMemoryCheckpointStore(),
				networkMonitor: monitor,
				retryPolicy: false,
				onStatusChange: (status) => statuses.push(status.status),
			}),
		).rejects.toMatchObject({ code: "SYNC_OFFLINE" });

		expect(statuses).toContain(SyncStatusKind.Paused);
	});

	test("retry policy contract increments retrying status", async () => {
		const schema = createMelonSchema({
			version: 1,
			collections: {
				tasks: {
					name: "tasks",
					primaryKey: "id",
					fields: { id: { kind: "string" }, title: { kind: "string" } },
				},
			},
		});
		const db = createDatabase({
			schema,
			adapter: createInMemoryAdapter(),
			sync: {},
		});
		let calls = 0;
		const statuses: string[] = [];

		await synchronize({
			db,
			pullChanges: async () => {
				calls += 1;
				if (calls < 2) {
					throw new Error("transient");
				}
				return { changes: {}, timestamp: 1 };
			},
			pushChanges: async () => {},
			checkpointStore: createMemoryCheckpointStore(),
			retryPolicy: {
				maxAttempts: 2,
				baseDelayMs: 1,
				maxDelayMs: 2,
				jitter: false,
			},
			onStatusChange: (status) => statuses.push(status.status),
		});

		expect(calls).toBe(2);
		expect(statuses).toContain(SyncStatusKind.Retrying);
	});
});
