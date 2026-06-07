import { describe, expect, test } from "bun:test";
import { createSqliteAdapter } from "@melon-db/db-sqlite";
import {
	type ConflictResolver,
	MelonErrorCode,
	type StorageAdapter,
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
	mergeRemoteWithPendingFields,
} from "../src/index.ts";

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
		drafts: {
			name: "drafts",
			localOnly: true,
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				note: { kind: "string" },
			},
		},
	},
});

function createSyncDb(adapter: StorageAdapter = createInMemoryAdapter()) {
	return createDatabase({
		schema: syncSchema,
		adapter,
		sync: {},
	});
}

describe("sync (in-memory)", () => {
	test("getLocalChanges returns created record after insert", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Sync me",
				status: "open",
			});
		});

		const changes = await db.getLocalChanges();
		expect(changes.tasks?.created).toHaveLength(1);
		expect(changes.tasks?.created[0]?.title).toBe("Sync me");
		expect(changes.tasks?.updated).toHaveLength(0);
		expect(changes.tasks?.deleted).toHaveLength(0);
	});

	test("update coalesces with prior create", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Original",
				status: "open",
			});
			await tx.collection("tasks").update("1", { title: "Updated" });
		});

		const changes = await db.getLocalChanges();
		expect(changes.tasks?.created).toHaveLength(1);
		expect(changes.tasks?.created[0]?.title).toBe("Updated");
		expect(changes.tasks?.updated).toHaveLength(0);
	});

	test("delete returns deleted id", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Gone",
				status: "open",
			});
		});
		await db.markLocalChangesPushed();

		await db.write(async (tx) => {
			await tx.collection("tasks").delete("1");
		});

		const changes = await db.getLocalChanges();
		expect(changes.tasks?.deleted).toEqual(["1"]);
		expect(changes.tasks?.created).toHaveLength(0);
	});

	test("delete after create removes outbox entry", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Ephemeral",
				status: "open",
			});
			await tx.collection("tasks").delete("1");
		});

		const changes = await db.getLocalChanges();
		expect(changes.tasks).toBeUndefined();
	});

	test("localOnly collection is excluded", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("drafts").insert({
				id: "d1",
				note: "local",
			});
		});

		const changes = await db.getLocalChanges();
		expect(changes.drafts).toBeUndefined();
	});

	test("applyRemoteChanges inserts remote records", async () => {
		const db = createSyncDb();
		await db.applyRemoteChanges({
			tasks: {
				created: [{ id: "r1", title: "Remote", status: "open" }],
				updated: [],
				deleted: [],
			},
		});

		const task = await db.collection("tasks").findById("r1");
		expect(task?.title).toBe("Remote");
	});

	test("applyRemoteChanges server-wins over local pending", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Local",
				status: "open",
			});
		});

		await db.applyRemoteChanges({
			tasks: {
				created: [],
				updated: [{ id: "1", title: "Server", status: "done" }],
				deleted: [],
			},
		});

		const task = await db.collection("tasks").findById("1");
		expect(task?.title).toBe("Server");
		const changes = await db.getLocalChanges();
		expect(changes.tasks).toBeUndefined();
	});

	test("markLocalChangesPushed clears outbox", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Push me",
				status: "open",
			});
		});

		expect(Object.keys(await db.getLocalChanges())).toHaveLength(1);
		await db.markLocalChangesPushed();
		expect(Object.keys(await db.getLocalChanges())).toHaveLength(0);
	});

	test("sync APIs throw when sync not enabled", async () => {
		const db = createDatabase({
			schema: syncSchema,
			adapter: createInMemoryAdapter(),
		});

		try {
			await db.getLocalChanges();
			expect.unreachable();
		} catch (error) {
			expect((error as { code: string }).code).toBe(
				MelonErrorCode.SYNC_NOT_ENABLED,
			);
		}
	});

	test("client-wins skips remote update when outbox has pending entry", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Local pending",
				status: "open",
			});
		});

		await db.applyRemoteChanges(
			{
				tasks: {
					created: [],
					updated: [{ id: "1", title: "Remote", status: "done" }],
					deleted: [],
				},
			},
			{ conflictPolicy: "client-wins" },
		);

		const task = await db.collection("tasks").findById("1");
		expect(task?.title).toBe("Local pending");
	});

	test("last-write-wins applies newer remote timestamp", async () => {
		const timestampSchema = createMelonSchema({
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
		const db = createDatabase({
			schema: timestampSchema,
			adapter: createInMemoryAdapter(),
			sync: {},
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Local",
				status: "open",
				_updated_at: 100,
			});
		});
		await db.markLocalChangesPushed();

		await db.applyRemoteChanges(
			{
				tasks: {
					created: [],
					updated: [
						{
							id: "1",
							title: "Remote newer",
							status: "done",
							_updated_at: 200,
						},
					],
					deleted: [],
				},
			},
			{ conflictPolicy: "last-write-wins" },
		);

		const task = await db.collection("tasks").findById("1");
		expect(task?.title).toBe("Remote newer");
	});

	test("last-write-wins skips older remote timestamp", async () => {
		const timestampSchema = createMelonSchema({
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
		const db = createDatabase({
			schema: timestampSchema,
			adapter: createInMemoryAdapter(),
			sync: {},
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Local newer",
				status: "open",
				_updated_at: 300,
			});
		});
		await db.markLocalChangesPushed();

		await db.applyRemoteChanges(
			{
				tasks: {
					created: [],
					updated: [
						{
							id: "1",
							title: "Remote older",
							status: "done",
							_updated_at: 100,
						},
					],
					deleted: [],
				},
			},
			{ conflictPolicy: "last-write-wins" },
		);

		const task = await db.collection("tasks").findById("1");
		expect(task?.title).toBe("Local newer");
	});

	test("merge-by-field merges disjoint local and remote field edits", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Baseline",
				status: "open",
			});
		});
		await db.markLocalChangesPushed();

		await db.write(async (tx) => {
			await tx.collection("tasks").update("1", { title: "Local title" });
		});

		await db.applyRemoteChanges(
			{
				tasks: {
					created: [],
					updated: [{ id: "1", title: "Remote title", status: "done" }],
					deleted: [],
				},
			},
			{ conflictPolicy: "merge-by-field" },
		);

		const task = await db.collection("tasks").findById("1");
		expect(task?.title).toBe("Local title");
		expect(task?.status).toBe("done");

		const changes = await db.getLocalChanges();
		expect(changes.tasks?.updated).toHaveLength(1);
	});

	test("merge-by-field keeps pending local title over remote on same field", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Baseline",
				status: "open",
			});
		});
		await db.markLocalChangesPushed();

		await db.write(async (tx) => {
			await tx.collection("tasks").update("1", { title: "Local edit" });
		});

		await db.applyRemoteChanges(
			{
				tasks: {
					created: [],
					updated: [{ id: "1", title: "Remote edit", status: "open" }],
					deleted: [],
				},
			},
			{ conflictPolicy: "merge-by-field" },
		);

		const task = await db.collection("tasks").findById("1");
		expect(task?.title).toBe("Local edit");
	});

	test("merge-by-field mergeProtectedFields keeps remote timestamp", async () => {
		const timestampSchema = createMelonSchema({
			version: 1,
			collections: {
				tasks: {
					name: "tasks",
					primaryKey: "id",
					fields: {
						id: { kind: "string" },
						title: { kind: "string" },
						_updated_at: { kind: "number" },
					},
				},
			},
		});
		const db = createDatabase({
			schema: timestampSchema,
			adapter: createInMemoryAdapter(),
			sync: {},
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Local",
				_updated_at: 100,
			});
		});
		await db.markLocalChangesPushed();

		await db.write(async (tx) => {
			await tx.collection("tasks").update("1", { title: "Local newer" });
		});

		await db.applyRemoteChanges(
			{
				tasks: {
					created: [],
					updated: [{ id: "1", title: "Remote title", _updated_at: 200 }],
					deleted: [],
				},
			},
			{
				conflictPolicy: "merge-by-field",
				mergeProtectedFields: ["_updated_at"],
			},
		);

		const task = await db.collection("tasks").findById("1");
		expect(task?.title).toBe("Local newer");
		expect(task?._updated_at).toBe(200);
	});

	test("merge-by-field skips remote update when outbox is created", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Unpushed create",
				status: "open",
			});
		});

		await db.applyRemoteChanges(
			{
				tasks: {
					created: [],
					updated: [{ id: "1", title: "Remote", status: "done" }],
					deleted: [],
				},
			},
			{ conflictPolicy: "merge-by-field" },
		);

		const task = await db.collection("tasks").findById("1");
		expect(task?.title).toBe("Unpushed create");
		expect(task?.status).toBe("open");
	});

	test("custom resolver skip keeps local row and outbox", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Local",
				status: "open",
			});
		});
		await db.markLocalChangesPushed();

		await db.write(async (tx) => {
			await tx.collection("tasks").update("1", { title: "Pending local" });
		});

		await db.applyRemoteChanges(
			{
				tasks: {
					created: [],
					updated: [{ id: "1", title: "Remote", status: "done" }],
					deleted: [],
				},
			},
			{
				conflictPolicy: "custom",
				conflictResolver: () => ({ action: "skip" }),
			},
		);

		const task = await db.collection("tasks").findById("1");
		expect(task?.title).toBe("Pending local");
		expect(task?.status).toBe("open");
		const changes = await db.getLocalChanges();
		expect(changes.tasks?.updated).toHaveLength(1);
	});

	test("custom resolver apply merges disjoint field edits", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Baseline",
				status: "open",
			});
		});
		await db.markLocalChangesPushed();

		await db.write(async (tx) => {
			await tx.collection("tasks").update("1", { title: "Local title" });
		});

		const resolver: ConflictResolver = (ctx) => ({
			action: "apply",
			record: {
				...ctx.remote,
				title:
					(ctx.outboxEntry?.pendingFields?.title as string | undefined) ??
					ctx.remote.title,
			},
			clearOutbox: false,
		});

		await db.applyRemoteChanges(
			{
				tasks: {
					created: [],
					updated: [{ id: "1", title: "Remote title", status: "done" }],
					deleted: [],
				},
			},
			{ conflictPolicy: "custom", conflictResolver: resolver },
		);

		const task = await db.collection("tasks").findById("1");
		expect(task?.title).toBe("Local title");
		expect(task?.status).toBe("done");
		const changes = await db.getLocalChanges();
		expect(changes.tasks?.updated).toHaveLength(1);
	});

	test("custom resolver clearOutbox false preserves outbox after apply", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Local",
				status: "open",
			});
		});
		await db.markLocalChangesPushed();
		await db.write(async (tx) => {
			await tx.collection("tasks").update("1", { title: "Pending" });
		});

		await db.applyRemoteChanges(
			{
				tasks: {
					created: [],
					updated: [{ id: "1", title: "Remote", status: "done" }],
					deleted: [],
				},
			},
			{
				conflictPolicy: "custom",
				conflictResolver: (ctx) => ({
					action: "apply",
					record: { ...ctx.remote, title: "Pending" },
					clearOutbox: false,
				}),
			},
		);

		expect((await db.getLocalChanges()).tasks?.updated).toHaveLength(1);
	});

	test("custom policy without resolver throws", async () => {
		const db = createSyncDb();
		await expect(
			db.applyRemoteChanges(
				{
					tasks: { created: [], updated: [], deleted: [] },
				},
				{ conflictPolicy: "custom" },
			),
		).rejects.toMatchObject({ code: MelonErrorCode.SYNC_APPLY_FAILED });
	});

	test("custom resolver skip on delete preserves local row", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Keep me",
				status: "open",
			});
		});
		await db.markLocalChangesPushed();

		await db.applyRemoteChanges(
			{
				tasks: {
					created: [],
					updated: [],
					deleted: ["1"],
				},
			},
			{
				conflictPolicy: "custom",
				conflictResolver: () => ({ action: "skip" }),
			},
		);

		const task = await db.collection("tasks").findById("1");
		expect(task?.title).toBe("Keep me");
	});

	test("custom resolver can use mergeRemoteWithPendingFields", async () => {
		const db = createSyncDb();
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Baseline",
				status: "open",
			});
		});
		await db.markLocalChangesPushed();
		await db.write(async (tx) => {
			await tx.collection("tasks").update("1", { title: "Local title" });
		});

		await db.applyRemoteChanges(
			{
				tasks: {
					created: [],
					updated: [{ id: "1", title: "Remote title", status: "done" }],
					deleted: [],
				},
			},
			{
				conflictPolicy: "custom",
				conflictResolver: (ctx) => ({
					action: "apply",
					record: mergeRemoteWithPendingFields({
						local: ctx.local,
						remote: ctx.remote,
						pendingFields: ctx.outboxEntry?.pendingFields,
						primaryKey: ctx.primaryKey,
					}),
					clearOutbox: false,
				}),
			},
		);

		const task = await db.collection("tasks").findById("1");
		expect(task?.title).toBe("Local title");
		expect(task?.status).toBe("done");
	});
});

describe("sync (sqlite)", () => {
	test("persists outbox across re-open when using same file", async () => {
		const adapter = createSqliteAdapter({ filename: ":memory:" });
		const db = createSyncDb(adapter);
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "SQLite sync",
				status: "open",
			});
		});

		const changes = await db.getLocalChanges();
		expect(changes.tasks?.created).toHaveLength(1);
		await adapter.close();
	});

	test("new writes after adapter re-open do not reuse stale outbox ids", async () => {
		const path = `/tmp/melon-sync-outbox-${Bun.randomUUIDv7()}.db`;
		const adapter1 = createSqliteAdapter({ filename: path });
		const db1 = createSyncDb(adapter1);
		await db1.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "seed-1",
				title: "First",
				status: "open",
			});
		});
		await adapter1.close();

		const adapter2 = createSqliteAdapter({ filename: path });
		const db2 = createSyncDb(adapter2);
		await expect(
			db2.write(async (tx) => {
				await tx.collection("tasks").insert({
					id: "seed-2",
					title: "After reload",
					status: "open",
				});
			}),
		).resolves.toBeUndefined();

		const changes = await db2.getLocalChanges();
		expect(changes.tasks?.created).toHaveLength(2);
		await adapter2.close();
	});

	test("sqlite adapter sync roundtrip", async () => {
		const db = createSyncDb(createSqliteAdapter({ filename: ":memory:" }));
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Row",
				status: "open",
			});
		});

		await db.markLocalChangesPushed();
		await db.applyRemoteChanges({
			tasks: {
				created: [{ id: "2", title: "Pulled", status: "open" }],
				updated: [],
				deleted: [],
			},
		});

		const pulled = await db.collection("tasks").findById("2");
		expect(pulled?.title).toBe("Pulled");
	});

	test("persists pending_fields in outbox across adapter re-open", async () => {
		const path = `/tmp/melon-sync-outbox-${Bun.randomUUIDv7()}.db`;
		const adapter1 = createSqliteAdapter({ filename: path });
		const db1 = createSyncDb(adapter1);
		await db1.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Baseline",
				status: "open",
			});
		});
		await db1.markLocalChangesPushed();
		await db1.write(async (tx) => {
			await tx.collection("tasks").update("1", { title: "Pending title" });
		});
		await adapter1.close();

		const adapter2 = createSqliteAdapter({ filename: path });
		const db2 = createSyncDb(adapter2);
		await db2.collection("tasks").count();
		const changes = await db2.getLocalChanges();
		expect(changes.tasks?.updated[0]?.title).toBe("Pending title");
		await adapter2.close();
	});

	test("checkpoint persists across adapter re-open with same file", async () => {
		const path = `/tmp/melon-sync-checkpoint-${Bun.randomUUIDv7()}.db`;
		const adapter1 = createSqliteAdapter({ filename: path });
		const db1 = createSyncDb(adapter1);
		await db1.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Checkpoint",
				status: "open",
			});
		});

		const checkpoint = db1.createCheckpointStore();
		await checkpoint.setLastPulledAt(999);
		await adapter1.close();

		const adapter2 = createSqliteAdapter({ filename: path });
		const db2 = createSyncDb(adapter2);
		await db2.collection("tasks").count();
		const restored = db2.createCheckpointStore();
		expect(await restored.getLastPulledAt()).toBe(999);
		await adapter2.close();
	});
});
