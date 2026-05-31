import { describe, expect, test } from "bun:test";
import { taskSchema } from "../__fixtures__/task-schema.ts";
import {
	createDatabase,
	createInMemoryAdapter,
	queryAst,
} from "../src/index.ts";

describe("loadIncludes", () => {
	test("loads belongsTo project on tasks", async () => {
		const db = createDatabase({
			schema: taskSchema,
			adapter: createInMemoryAdapter(),
		});

		await db.write(async (tx) => {
			await tx.collection("projects").insert({
				id: "p1",
				name: "Melon",
			});
			await tx.collection("tasks").insert({
				id: "t1",
				title: "Ship includes",
				status: "open",
				priority: 1,
				projectId: "p1",
				updatedAt: new Date(),
			});
		});

		const rows = await db.collection("tasks").findMany(
			queryAst("tasks", {
				select: {
					include: {
						project: { relation: "project" },
					},
				},
			}),
		);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.project).toEqual({ id: "p1", name: "Melon" });
	});
});
