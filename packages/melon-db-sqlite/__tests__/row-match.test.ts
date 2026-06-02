import { describe, expect, test } from "bun:test";
import { rowMatchesWhere } from "../src/observe/row-match.ts";

describe("rowMatchesWhere", () => {
	test("matches row satisfying eq predicate", () => {
		const where = {
			type: "predicate" as const,
			predicate: { field: "status", op: "eq" as const, value: "open" },
		};

		expect(rowMatchesWhere("tasks", { id: "1", status: "open" }, where)).toBe(
			true,
		);
		expect(rowMatchesWhere("tasks", { id: "1", status: "closed" }, where)).toBe(
			false,
		);
	});

	test("empty where matches any row", () => {
		expect(rowMatchesWhere("tasks", { id: "1" }, undefined)).toBe(true);
	});
});
