import { describe, expect, test } from "bun:test";
import { createSqliteAdapter } from "@melon/db-sqlite";
import { taskSchema } from "../__fixtures__/task-schema.ts";
import {
	and,
	createDatabase,
	createInMemoryAdapter,
	predicate,
	queryAst,
} from "../src/index.ts";

describe("relationFilters", () => {
	test("filters tasks by related project name (in-memory)", async () => {
		const db = createDatabase({
			schema: taskSchema,
			adapter: createInMemoryAdapter(),
		});

		await db.write(async (tx) => {
			await tx.collection("projects").insert({ id: "p1", name: "Acme" });
			await tx.collection("projects").insert({ id: "p2", name: "Other" });
			await tx.collection("tasks").insert({
				id: "t1",
				title: "A",
				status: "open",
				priority: 1,
				projectId: "p1",
				updatedAt: new Date(),
			});
			await tx.collection("tasks").insert({
				id: "t2",
				title: "B",
				status: "open",
				priority: 1,
				projectId: "p2",
				updatedAt: new Date(),
			});
		});

		const rows = await db.collection("tasks").findMany(
			queryAst("tasks", {
				where: predicate("status", "eq", "open"),
				relationFilters: [
					{
						relation: "project",
						where: predicate("name", "eq", "Acme"),
					},
				],
			}),
		);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.id).toBe("t1");
	});

	test("filters tasks by related project name (sqlite)", async () => {
		const db = createDatabase({
			schema: taskSchema,
			adapter: createSqliteAdapter({ filename: ":memory:" }),
		});

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
			await tx.collection("tasks").insert({
				id: "t2",
				title: "B",
				status: "open",
				priority: 1,
				projectId: "p2",
				updatedAt: new Date(),
			});
			await tx.collection("projects").insert({ id: "p2", name: "Other" });
		});

		const rows = await db.collection("tasks").findMany(
			queryAst("tasks", {
				relationFilters: [
					{
						relation: "project",
						where: and(predicate("name", "eq", "Acme")),
					},
				],
			}),
		);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.id).toBe("t1");
	});
});
