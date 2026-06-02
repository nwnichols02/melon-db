import { describe, expect, test } from "bun:test";
import type { PreparedQuery, StorageAdapter } from "@melon/db";
import { createDatabase, predicate, prepareQuery, queryAst } from "@melon/db";
import { taskSchema } from "../../melon-db/__fixtures__/task-schema.ts";
import { createSqliteAdapter } from "../src/adapter.ts";
import { getSqliteDriverForTests } from "../src/testing.ts";

function subscribeObserve(
	adapter: StorageAdapter,
	prepared: PreparedQuery,
	onChange: () => void,
): () => void {
	if (!adapter.observeQuery) {
		throw new Error("observeQuery not implemented");
	}
	return adapter.observeQuery(prepared, onChange);
}

const openTasksQuery = prepareQuery(
	queryAst("tasks", { where: predicate("status", "eq", "open") }),
	taskSchema,
);

describe("sqlite observeQuery", () => {
	test("adapter exposes reactive observeQuery", () => {
		const adapter = createSqliteAdapter({ filename: ":memory:" });
		expect(adapter.capabilities.reactiveSubscriptions).toBe(true);
		expect(adapter.observeQuery).toBeDefined();
	});

	test("irrelevant insert does not notify subscribers", async () => {
		const adapter = createSqliteAdapter({ filename: ":memory:" });
		const db = createDatabase({ schema: taskSchema, adapter });
		await db.adapter.initialize(taskSchema);

		let notifyCount = 0;
		const unsub = subscribeObserve(adapter, openTasksQuery, () => {
			notifyCount += 1;
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "open-1",
				title: "Open",
				status: "open",
				priority: 1,
				updatedAt: new Date(),
			});
		});

		await new Promise((r) => setTimeout(r, 10));
		const countAfterOpen = notifyCount;

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "closed-1",
				title: "Closed",
				status: "closed",
				priority: 1,
				updatedAt: new Date(),
			});
		});

		await new Promise((r) => setTimeout(r, 10));
		expect(notifyCount).toBe(countAfterOpen);

		unsub();
		await db.adapter.close();
	});

	test("relevant insert notifies subscribers", async () => {
		const adapter = createSqliteAdapter({ filename: ":memory:" });
		const db = createDatabase({ schema: taskSchema, adapter });
		await db.adapter.initialize(taskSchema);

		let notifyCount = 0;
		const unsub = subscribeObserve(adapter, openTasksQuery, () => {
			notifyCount += 1;
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "open-1",
				title: "Open",
				status: "open",
				priority: 1,
				updatedAt: new Date(),
			});
		});

		await new Promise((r) => setTimeout(r, 10));
		expect(notifyCount).toBeGreaterThanOrEqual(1);

		unsub();
		await db.adapter.close();
	});

	test("update open to closed notifies open query", async () => {
		const adapter = createSqliteAdapter({ filename: ":memory:" });
		const db = createDatabase({ schema: taskSchema, adapter });
		await db.adapter.initialize(taskSchema);

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "t1",
				title: "T",
				status: "open",
				priority: 1,
				updatedAt: new Date(),
			});
		});

		let notifyCount = 0;
		const unsub = subscribeObserve(adapter, openTasksQuery, () => {
			notifyCount += 1;
		});

		const countAfterSubscribe = notifyCount;

		await db.write(async (tx) => {
			await tx.collection("tasks").update("t1", { status: "closed" });
		});

		await new Promise((r) => setTimeout(r, 10));
		expect(notifyCount).toBeGreaterThan(countAfterSubscribe);

		unsub();
		await db.adapter.close();
	});

	test("update on non-matching row does not notify open query", async () => {
		const adapter = createSqliteAdapter({ filename: ":memory:" });
		const db = createDatabase({ schema: taskSchema, adapter });
		await db.adapter.initialize(taskSchema);

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "closed-1",
				title: "C",
				status: "closed",
				priority: 1,
				updatedAt: new Date(),
			});
		});

		let notifyCount = 0;
		const unsub = subscribeObserve(adapter, openTasksQuery, () => {
			notifyCount += 1;
		});

		await new Promise((r) => setTimeout(r, 10));
		const countAfterSubscribe = notifyCount;

		await db.write(async (tx) => {
			await tx.collection("tasks").update("closed-1", { title: "Renamed" });
		});

		await new Promise((r) => setTimeout(r, 10));
		expect(notifyCount).toBe(countAfterSubscribe);

		unsub();
		await db.adapter.close();
	});

	test("two subscriptions only affected predicate fires", async () => {
		const adapter = createSqliteAdapter({ filename: ":memory:" });
		const db = createDatabase({ schema: taskSchema, adapter });
		await db.adapter.initialize(taskSchema);

		const openQuery = prepareQuery(
			queryAst("tasks", { where: predicate("status", "eq", "open") }),
			taskSchema,
		);
		const closedQuery = prepareQuery(
			queryAst("tasks", { where: predicate("status", "eq", "closed") }),
			taskSchema,
		);

		let openCount = 0;
		let closedCount = 0;

		const unsubOpen = subscribeObserve(adapter, openQuery, () => {
			openCount += 1;
		});
		const unsubClosed = subscribeObserve(adapter, closedQuery, () => {
			closedCount += 1;
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "open-1",
				title: "O",
				status: "open",
				priority: 1,
				updatedAt: new Date(),
			});
		});

		await new Promise((r) => setTimeout(r, 10));
		const openAfterInsert = openCount;
		const closedAfterInsert = closedCount;

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "closed-1",
				title: "C",
				status: "closed",
				priority: 1,
				updatedAt: new Date(),
			});
		});

		await new Promise((r) => setTimeout(r, 10));
		expect(openCount).toBe(openAfterInsert);
		expect(closedCount).toBeGreaterThan(closedAfterInsert);

		unsubOpen();
		unsubClosed();
		await db.adapter.close();
	});

	test("batch write invalidates per child operation", async () => {
		const adapter = createSqliteAdapter({ filename: ":memory:" });
		const db = createDatabase({ schema: taskSchema, adapter });
		await db.adapter.initialize(taskSchema);

		let notifyCount = 0;
		const unsub = subscribeObserve(adapter, openTasksQuery, () => {
			notifyCount += 1;
		});

		await db.write(async (tx) => {
			await tx.batch([
				{
					type: "insert",
					collection: "tasks",
					values: {
						id: "open-1",
						title: "O",
						status: "open",
						priority: 1,
						updatedAt: new Date(),
					},
				},
				{
					type: "insert",
					collection: "tasks",
					values: {
						id: "closed-1",
						title: "C",
						status: "closed",
						priority: 1,
						updatedAt: new Date(),
					},
				},
			]);
		});

		await new Promise((r) => setTimeout(r, 10));
		expect(notifyCount).toBeGreaterThanOrEqual(1);

		unsub();
		await db.adapter.close();
	});

	test("external insert via raw SQL notifies after flushObservationQueue", async () => {
		const adapter = createSqliteAdapter({ filename: ":memory:" });
		const db = createDatabase({ schema: taskSchema, adapter });
		await db.adapter.initialize(taskSchema);

		const driver = getSqliteDriverForTests(adapter);
		if (!driver) {
			throw new Error("test driver not registered");
		}

		let notifyCount = 0;
		const unsub = subscribeObserve(adapter, openTasksQuery, () => {
			notifyCount += 1;
		});

		await new Promise((r) => setTimeout(r, 10));
		const countAfterSubscribe = notifyCount;

		await driver.exec(`
			INSERT INTO "tasks" ("id", "title", "status", "priority", "updatedAt")
			VALUES ('ext-open-1', 'External', 'open', 1, ${Date.now()})
		`);

		await new Promise((r) => setTimeout(r, 10));
		expect(notifyCount).toBe(countAfterSubscribe);

		if (!adapter.flushObservationQueue) {
			throw new Error("flushObservationQueue not implemented");
		}
		await adapter.flushObservationQueue();
		await new Promise((r) => setTimeout(r, 10));
		expect(notifyCount).toBeGreaterThan(countAfterSubscribe);

		unsub();
		await db.adapter.close();
	});

	test("external irrelevant insert does not notify after flush", async () => {
		const adapter = createSqliteAdapter({ filename: ":memory:" });
		const db = createDatabase({ schema: taskSchema, adapter });
		await db.adapter.initialize(taskSchema);

		const driver = getSqliteDriverForTests(adapter);
		if (!driver) {
			throw new Error("test driver not registered");
		}

		let notifyCount = 0;
		const unsub = subscribeObserve(adapter, openTasksQuery, () => {
			notifyCount += 1;
		});

		await new Promise((r) => setTimeout(r, 10));
		const countAfterSubscribe = notifyCount;

		await driver.exec(`
			INSERT INTO "tasks" ("id", "title", "status", "priority", "updatedAt")
			VALUES ('ext-closed-1', 'External', 'closed', 1, ${Date.now()})
		`);

		if (!adapter.flushObservationQueue) {
			throw new Error("flushObservationQueue not implemented");
		}
		await adapter.flushObservationQueue();
		await new Promise((r) => setTimeout(r, 10));
		expect(notifyCount).toBe(countAfterSubscribe);

		unsub();
		await db.adapter.close();
	});

	test("project rename notifies task query with relationFilters", async () => {
		const adapter = createSqliteAdapter({ filename: ":memory:" });
		const db = createDatabase({ schema: taskSchema, adapter });
		await db.adapter.initialize(taskSchema);

		await db.write(async (tx) => {
			await tx.collection("projects").insert({ id: "p1", name: "Acme" });
			await tx.collection("tasks").insert({
				id: "t1",
				title: "A",
				status: "open",
				priority: 1,
				projectId: "p1",
				updatedAt: new Date(),
			});
		});

		const acmeTasksQuery = prepareQuery(
			queryAst("tasks", {
				where: predicate("status", "eq", "open"),
				relationFilters: [
					{
						relation: "project",
						where: predicate("name", "eq", "Acme"),
					},
				],
			}),
			taskSchema,
		);

		let notifyCount = 0;
		const unsub = subscribeObserve(adapter, acmeTasksQuery, () => {
			notifyCount += 1;
		});

		await new Promise((r) => setTimeout(r, 10));
		const countAfterSubscribe = notifyCount;

		await db.write(async (tx) => {
			await tx.collection("projects").update("p1", { name: "Renamed" });
		});

		await new Promise((r) => setTimeout(r, 10));
		expect(notifyCount).toBeGreaterThan(countAfterSubscribe);

		unsub();
		await db.adapter.close();
	});

	test("task priority update does not notify status-only open query", async () => {
		const adapter = createSqliteAdapter({ filename: ":memory:" });
		const db = createDatabase({ schema: taskSchema, adapter });
		await db.adapter.initialize(taskSchema);

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "t1",
				title: "A",
				status: "open",
				priority: 1,
				updatedAt: new Date(),
			});
		});

		let notifyCount = 0;
		const unsub = subscribeObserve(adapter, openTasksQuery, () => {
			notifyCount += 1;
		});

		await new Promise((r) => setTimeout(r, 10));
		const countAfterSubscribe = notifyCount;

		await db.write(async (tx) => {
			await tx.collection("tasks").update("t1", { priority: 5 });
		});

		await new Promise((r) => setTimeout(r, 10));
		expect(notifyCount).toBe(countAfterSubscribe);

		unsub();
		await db.adapter.close();
	});

	test("orderBy limit query notifies when sort field changes", async () => {
		const adapter = createSqliteAdapter({ filename: ":memory:" });
		const db = createDatabase({ schema: taskSchema, adapter });
		await db.adapter.initialize(taskSchema);

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "t1",
				title: "A",
				status: "open",
				priority: 1,
				updatedAt: new Date(),
			});
		});

		const topOpenQuery = prepareQuery(
			queryAst("tasks", {
				where: predicate("status", "eq", "open"),
				orderBy: [{ field: "priority", direction: "desc" }],
				limit: 1,
			}),
			taskSchema,
		);

		let notifyCount = 0;
		const unsub = subscribeObserve(adapter, topOpenQuery, () => {
			notifyCount += 1;
		});

		await new Promise((r) => setTimeout(r, 10));
		const countAfterSubscribe = notifyCount;

		await db.write(async (tx) => {
			await tx.collection("tasks").update("t1", { priority: 10 });
		});

		await new Promise((r) => setTimeout(r, 10));
		expect(notifyCount).toBeGreaterThan(countAfterSubscribe);

		unsub();
		await db.adapter.close();
	});
});
