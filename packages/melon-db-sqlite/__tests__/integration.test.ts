import { describe, expect, test } from "bun:test";
import { unlinkSync } from "node:fs";
import { createDatabase, predicate, queryAst } from "@melon-db/db";
import { type DatabaseSchemaDefinition, createMelonSchema } from "@melon-db/db";
import { createSqliteAdapter } from "../src/adapter.ts";

const def: DatabaseSchemaDefinition = {
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				title: { kind: "string" },
				status: { kind: "string" },
				priority: { kind: "number" },
			},
		},
	},
};

const schema = createMelonSchema(def);

describe("sqlite adapter integration", () => {
	test("CRUD via createDatabase", async () => {
		const path = `/tmp/melon-test-${Date.now()}.db`;
		const db = createDatabase({
			schema,
			adapter: createSqliteAdapter({ filename: path }),
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Task",
				status: "open",
				priority: 2,
			});
		});

		const rows = await db
			.collection("tasks")
			.findMany(
				queryAst("tasks", { where: predicate("status", "eq", "open") }),
			);
		expect(rows).toHaveLength(1);
		expect(rows[0]?.title).toBe("Task");

		await db.write(async (tx) => {
			await tx.collection("tasks").update("1", { title: "Updated" });
		});

		const updated = await db.collection("tasks").findById("1");
		expect(updated?.title).toBe("Updated");

		db.adapter.close();
		try {
			unlinkSync(path);
		} catch {
			// ignore cleanup errors
		}
	});
});
