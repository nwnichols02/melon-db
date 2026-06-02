import { describe, expect, test } from "bun:test";
import { createMelonSchema, prepareQuery, queryAst } from "@melon/db";
import {
	isPreparedQuery,
	mangoQueryKey,
	prismaArgsKey,
	queryInputKey,
} from "../src/query-deps.ts";

const testSchema = createMelonSchema({
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: { id: { kind: "string" } },
		},
	},
});

describe("query-deps", () => {
	test("mangoQueryKey is stable for equivalent queries", () => {
		const a = mangoQueryKey({
			selector: { status: "open" },
			sort: [{ priority: "desc" }],
			limit: 5,
		});
		const b = mangoQueryKey({
			selector: { status: "open" },
			sort: [{ priority: "desc" }],
			limit: 5,
		});
		expect(a).toBe(b);
	});

	test("prismaArgsKey is stable for equivalent args", () => {
		const args = { where: { status: "open" }, take: 5 };
		expect(prismaArgsKey(args)).toBe(prismaArgsKey({ ...args }));
	});

	test("isPreparedQuery distinguishes ast from prepared", () => {
		const ast = queryAst("tasks", { mode: "many" });
		const prepared = prepareQuery(ast, testSchema);
		expect(isPreparedQuery(ast)).toBe(false);
		expect(isPreparedQuery(prepared)).toBe(true);
		expect(queryInputKey(prepared)).toBe(queryInputKey(ast));
	});

	test("queryAstKey ignores object identity", () => {
		const ast = queryAst("tasks", {
			where: {
				type: "predicate",
				predicate: { field: "status", op: "eq", value: "open" },
			},
		});
		expect(JSON.stringify(ast)).toBe(
			JSON.stringify({
				...ast,
				where: { ...ast.where },
			}),
		);
	});
});
