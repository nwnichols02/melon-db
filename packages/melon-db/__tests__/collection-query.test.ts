import { describe, expect, test } from "bun:test";
import { createQueryFactory } from "@melon-db/db-query";
import { taskSchema } from "../__fixtures__/task-schema.ts";
import { createDatabase, createInMemoryAdapter } from "../src/index.ts";

const q = createQueryFactory(taskSchema);

describe("collection.query builder overload", () => {
	test("accepts fluent builder callback", async () => {
		const db = createDatabase({
			schema: taskSchema,
			adapter: createInMemoryAdapter(),
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "t1",
				title: "Open",
				status: "open",
				priority: 2,
				updatedAt: new Date(),
			});
			await tx.collection("tasks").insert({
				id: "t2",
				title: "Closed",
				status: "closed",
				priority: 1,
				updatedAt: new Date(),
			});
		});

		const rows = await db
			.collection("tasks")
			.query((b) => b.where("status", "eq", "open"))
			.fetch();

		expect(rows).toHaveLength(1);
		expect(rows[0]?.id).toBe("t1");
	});

	test("accepts () => QueryAst thunk", async () => {
		const db = createDatabase({
			schema: taskSchema,
			adapter: createInMemoryAdapter(),
		});
		const q = createQueryFactory(taskSchema);

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "t1",
				title: "One",
				status: "open",
				priority: 1,
				updatedAt: new Date(),
			});
		});

		const rows = await db
			.collection("tasks")
			.query(() => q.from("tasks").toAst())
			.fetch();

		expect(rows).toHaveLength(1);
	});
});
