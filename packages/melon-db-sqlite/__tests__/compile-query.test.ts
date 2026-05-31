import { describe, expect, test } from "bun:test";
import { predicate, prepareQuery, queryAst } from "@melon/db";
import { type DatabaseSchemaDefinition, createMelonSchema } from "@melon/db";
import { compileQuery } from "../src/sql/compile-query.ts";

const def: DatabaseSchemaDefinition = {
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			fields: {
				id: { kind: "string" },
				status: { kind: "string" },
				priority: { kind: "number" },
			},
		},
	},
};

const schema = createMelonSchema(def);

describe("compileQuery", () => {
	test("compiles SELECT with WHERE", () => {
		const prepared = prepareQuery(
			queryAst("tasks", {
				where: predicate("status", "eq", "open"),
				limit: 10,
			}),
			schema,
		);
		const { sql, params } = compileQuery(prepared);
		expect(sql).toContain('SELECT * FROM "tasks"');
		expect(sql).toContain('"status" = ?');
		expect(sql).toContain("LIMIT ?");
		expect(params).toEqual(["open", 10]);
	});

	test("compiles COUNT", () => {
		const prepared = prepareQuery(queryAst("tasks", { mode: "count" }), schema);
		const { sql } = compileQuery(prepared);
		expect(sql).toBe('SELECT COUNT(*) as count FROM "tasks"');
	});

	test("compiles one mode", () => {
		const prepared = prepareQuery(queryAst("tasks", { mode: "one" }), schema);
		const { sql } = compileQuery(prepared);
		expect(sql).toContain("LIMIT 1");
	});

	test("compiles orderBy with multiple columns", () => {
		const prepared = prepareQuery(
			queryAst("tasks", {
				orderBy: [
					{ field: "priority", direction: "desc" },
					{ field: "id", direction: "asc" },
				],
			}),
			schema,
		);
		const { sql } = compileQuery(prepared);
		expect(sql).toContain('ORDER BY "priority" DESC, "id" ASC');
	});

	test("compiles skip offset", () => {
		const prepared = prepareQuery(
			queryAst("tasks", { skip: 10, limit: 5 }),
			schema,
		);
		const { sql, params } = compileQuery(prepared);
		expect(sql).toContain("LIMIT ?");
		expect(sql).toContain("OFFSET ?");
		expect(params).toEqual([5, 10]);
	});

	test("compiles combined where order limit skip", () => {
		const prepared = prepareQuery(
			queryAst("tasks", {
				where: predicate("status", "eq", "open"),
				orderBy: [{ field: "priority", direction: "desc" }],
				limit: 20,
				skip: 5,
			}),
			schema,
		);
		const { sql, params } = compileQuery(prepared);
		expect(sql).toBe(
			'SELECT * FROM "tasks" WHERE "status" = ? ORDER BY "priority" DESC LIMIT ? OFFSET ?',
		);
		expect(params).toEqual(["open", 20, 5]);
	});
});
