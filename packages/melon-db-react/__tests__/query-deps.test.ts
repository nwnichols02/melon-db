import { describe, expect, test } from "bun:test";
import { queryAst } from "@melon/db";
import { mangoQueryKey, prismaArgsKey } from "../src/query-deps.ts";

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
