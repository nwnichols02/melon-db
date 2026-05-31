import { describe, expect, test } from "bun:test";
import { createSqliteAdapter } from "@melon/db-sqlite";
import {
	MelonErrorCode,
	type StorageAdapter,
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
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
});
