import { describe, expect, test } from "bun:test";
import { and, not, or, predicate } from "@melon-db/db";
import { compileWhere } from "../src/sql/compile-predicate.ts";

describe("compileWhere", () => {
	test("compiles eq", () => {
		const { sql, params } = compileWhere(predicate("status", "eq", "open"));
		expect(sql).toBe('"status" = ?');
		expect(params).toEqual(["open"]);
	});

	test("compiles neq", () => {
		const { sql, params } = compileWhere(predicate("status", "neq", "closed"));
		expect(sql).toBe('"status" != ?');
		expect(params).toEqual(["closed"]);
	});

	test("compiles gt, gte, lt, lte", () => {
		expect(compileWhere(predicate("priority", "gt", 2)).sql).toBe(
			'"priority" > ?',
		);
		expect(compileWhere(predicate("priority", "gte", 2)).sql).toBe(
			'"priority" >= ?',
		);
		expect(compileWhere(predicate("priority", "lt", 5)).sql).toBe(
			'"priority" < ?',
		);
		expect(compileWhere(predicate("priority", "lte", 5)).sql).toBe(
			'"priority" <= ?',
		);
	});

	test("compiles in and notIn with param order", () => {
		const inResult = compileWhere(predicate("status", "in", ["open", "done"]));
		expect(inResult.sql).toBe('"status" IN (?, ?)');
		expect(inResult.params).toEqual(["open", "done"]);

		const notInResult = compileWhere(
			predicate("status", "notIn", ["archived"]),
		);
		expect(notInResult.sql).toBe('"status" NOT IN (?)');
		expect(notInResult.params).toEqual(["archived"]);
	});

	test("compiles like and contains", () => {
		const likeResult = compileWhere(predicate("title", "like", "%task%"));
		expect(likeResult.sql).toBe('"title" LIKE ?');
		expect(likeResult.params).toEqual(["%task%"]);

		const containsResult = compileWhere(predicate("title", "contains", "task"));
		expect(containsResult.sql).toBe('"title" LIKE ?');
		expect(containsResult.params).toEqual(["%task%"]);
	});

	test("compiles isNull without params", () => {
		const { sql, params } = compileWhere(predicate("dueDate", "isNull"));
		expect(sql).toBe('"dueDate" IS NULL');
		expect(params).toEqual([]);
	});

	test("compiles nested and/or/not", () => {
		const node = and(
			predicate("status", "eq", "open"),
			or(
				predicate("priority", "gte", 2),
				not(predicate("archived", "eq", true)),
			),
		);
		const { sql, params } = compileWhere(node);
		expect(sql).toBe(
			'("status" = ? AND ("priority" >= ? OR (NOT "archived" = ?)))',
		);
		expect(params).toEqual(["open", 2, true]);
	});

	test("returns empty fragment when where is undefined", () => {
		const { sql, params } = compileWhere(undefined);
		expect(sql).toBe("");
		expect(params).toEqual([]);
	});
});
