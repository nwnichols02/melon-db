import { describe, expect, test } from "bun:test";
import type { QueryAst } from "@melon-db/db";
import { QueryBuilder } from "@melon-db/db-query";
import { createInMemoryAdapter } from "../src/adapters/in-memory/adapter.ts";
import { createDatabase } from "../src/database/create-database.ts";
import { createMelonSchema } from "../src/schema.ts";

const schema = createMelonSchema({
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				status: { kind: "string" },
				title: { kind: "string" },
			},
		},
	},
});

describe("CollectionQueryInput", () => {
	test("query accepts plain QueryAst", async () => {
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				status: "open",
				title: "A",
			});
		});
		const rows = await db
			.collection("tasks")
			.query({
				collection: "tasks",
				mode: "many",
				where: {
					type: "predicate",
					predicate: { field: "status", op: "eq", value: "open" },
				},
			})
			.fetch();
		expect(rows).toHaveLength(1);
		await db.adapter.close();
	});

	test("query accepts () => QueryAst thunk", async () => {
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				status: "open",
				title: "A",
			});
			await tx.collection("tasks").insert({
				id: "2",
				status: "done",
				title: "B",
			});
		});
		const rows = await db
			.collection("tasks")
			.query(
				(): QueryAst => ({
					collection: "tasks",
					mode: "many",
					where: {
						type: "predicate",
						predicate: { field: "status", op: "eq", value: "open" },
					},
				}),
			)
			.fetch();
		expect(rows).toHaveLength(1);
		await db.adapter.close();
	});

	test("query accepts fluent builder callback", async () => {
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				status: "open",
				title: "A",
			});
			await tx.collection("tasks").insert({
				id: "2",
				status: "done",
				title: "B",
			});
		});
		const handle = db
			.collection("tasks")
			.query((b) => b.where("status", "eq", "open").limit(10));
		expect(handle.prepared.ast.where).toEqual({
			type: "predicate",
			predicate: { field: "status", op: "eq", value: "open" },
		});
		expect(handle.prepared.ast.limit).toBe(10);
		const rows = await handle.fetch();
		expect(rows).toHaveLength(1);
		await db.adapter.close();
	});

	test("findMany accepts fluent builder callback", async () => {
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				status: "open",
				title: "A",
			});
			await tx.collection("tasks").insert({
				id: "2",
				status: "done",
				title: "B",
			});
		});
		const rows = await db
			.collection("tasks")
			.findMany((b) => b.where("status", "eq", "open"));
		expect(rows).toHaveLength(1);
		expect((rows[0] as { id: string }).id).toBe("1");
		await db.adapter.close();
	});

	test("count accepts fluent builder callback", async () => {
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				status: "open",
				title: "A",
			});
			await tx.collection("tasks").insert({
				id: "2",
				status: "open",
				title: "B",
			});
			await tx.collection("tasks").insert({
				id: "3",
				status: "done",
				title: "C",
			});
		});
		const count = await db
			.collection("tasks")
			.count((b) => b.where("status", "eq", "open"));
		expect(count).toBe(2);
		await db.adapter.close();
	});

	test("builder callback uses QueryBuilder class", () => {
		const builder = new QueryBuilder<{ status: string }>("tasks");
		const ast = builder.where("status", "eq", "open").toAst();
		expect(ast.collection).toBe("tasks");
		expect(ast.mode).toBe("many");
	});
});
