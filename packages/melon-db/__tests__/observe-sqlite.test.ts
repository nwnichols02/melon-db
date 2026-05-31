import { describe, expect, test } from "bun:test";
import { taskSchema } from "../__fixtures__/task-schema.ts";
import { predicate, queryAst } from "../src/ast.ts";
import { createDatabase } from "../src/database/create-database.ts";

describe("observe with sqlite adapter", () => {
	test("query observe fires on write", async () => {
		const { createSqliteAdapter } = await import("@melon/db-sqlite");
		const db = createDatabase({
			schema: taskSchema,
			adapter: createSqliteAdapter({ filename: ":memory:" }),
		});
		const values: string[][] = [];

		const query = db
			.collection("tasks")
			.query(queryAst("tasks", { where: predicate("status", "eq", "open") }));

		const unsub = query.observe((rows) => {
			values.push(rows.map((r) => r.id as string));
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "t1",
				title: "T",
				status: "open",
				priority: 1,
				updatedAt: new Date(),
			});
		});

		await new Promise((r) => setTimeout(r, 10));

		expect(values.length).toBeGreaterThanOrEqual(2);
		expect(values.at(-1)).toEqual(["t1"]);

		unsub();
		await db.adapter.close();
	});

	test("observeCollections filters by name", async () => {
		const { createSqliteAdapter } = await import("@melon/db-sqlite");
		const db = createDatabase({
			schema: taskSchema,
			adapter: createSqliteAdapter({ filename: ":memory:" }),
		});
		const changes: string[] = [];

		const unsub = db.observeCollections(["tasks"], (set) => {
			if (set.collections.tasks?.created.length) {
				changes.push(...set.collections.tasks.created.map(String));
			}
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "x",
				title: "X",
				status: "open",
				priority: 1,
				updatedAt: new Date(),
			});
			await tx.collection("projects").insert({ id: "p1", name: "P" });
		});

		await new Promise((r) => setTimeout(r, 10));
		expect(changes).toContain("x");
		unsub();
		await db.adapter.close();
	});
});
