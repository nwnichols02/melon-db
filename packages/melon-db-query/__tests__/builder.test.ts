import { describe, expect, test } from "bun:test";
import { type DatabaseSchemaDefinition, createMelonSchema } from "@melon/db";
import { createQueryFactory } from "../src/query-factory.ts";

const schema = createMelonSchema({
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			fields: { id: { kind: "string" }, status: { kind: "string" } },
		},
	},
});

describe("QueryBuilder", () => {
	test("builds AST", () => {
		const q = createQueryFactory(schema);
		const ast = q
			.from<{ status: string }>("tasks")
			.where("status", "eq", "open")
			.orderBy("status", "desc")
			.limit(5)
			.toAst();
		expect(ast.collection).toBe("tasks");
		expect(ast.limit).toBe(5);
	});

	test("not() wraps predicate in NOT node", () => {
		const q = createQueryFactory(schema);
		const ast = q
			.from<{ archived: boolean }>("tasks")
			.not((inner) => inner.where("archived", "eq", true))
			.toAst();
		expect(ast.where).toEqual({
			type: "not",
			node: {
				type: "predicate",
				predicate: { field: "archived", op: "eq", value: true },
			},
		});
	});

	test("not() AND-combines with prior where", () => {
		const q = createQueryFactory(schema);
		const ast = q
			.from<{ status: string; archived: boolean }>("tasks")
			.where("status", "eq", "open")
			.not((inner) => inner.where("archived", "eq", true))
			.toAst();
		expect(ast.where?.type).toBe("and");
		if (ast.where?.type === "and") {
			expect(ast.where.nodes).toHaveLength(2);
			expect(ast.where.nodes[1]).toEqual({
				type: "not",
				node: {
					type: "predicate",
					predicate: { field: "archived", op: "eq", value: true },
				},
			});
		}
	});
});
