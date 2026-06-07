import { describe, expect, test } from "bun:test";
import { createDatabase, createMelonSchema } from "@melon-db/db";
import { createSqliteAdapter } from "../src/adapter.ts";

const schema = createMelonSchema({
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				title: { kind: "string" },
			},
		},
	},
});

describe("transaction rollback", () => {
	test("batch write rolls back on failure", async () => {
		const db = createDatabase({
			schema,
			adapter: createSqliteAdapter({ filename: ":memory:" }),
		});

		await expect(
			db.write(async (tx) => {
				await tx.batch([
					{
						type: "insert",
						collection: "tasks",
						values: { id: "1", title: "First" },
					},
					{
						type: "insert",
						collection: "tasks",
						values: { id: "1", title: "Duplicate" },
					},
				]);
			}),
		).rejects.toThrow();

		const count = await db.collection("tasks").count();
		expect(count).toBe(0);
		await db.adapter.close();
	});

	test("adapter.transaction rolls back on thrown error", async () => {
		const adapter = createSqliteAdapter({ filename: ":memory:" });
		await adapter.initialize(schema);

		await expect(
			adapter.transaction(async () => {
				await adapter.write({
					type: "insert",
					collection: "tasks",
					values: { id: "1", title: "Rollback me" },
				});
				throw new Error("fail");
			}),
		).rejects.toThrow("fail");

		const result = await adapter.find({
			ast: { collection: "tasks", mode: "many" },
			plan: { stableSort: [] },
			source: "melon",
		});
		expect(result.rows).toHaveLength(0);
		await adapter.close();
	});
});
