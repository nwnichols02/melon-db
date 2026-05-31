import { describe, expect, test } from "bun:test";
import { byForeignKey, byId } from "../src/utilities.ts";

describe("query utilities", () => {
	test("byId builds one-mode eq predicate", () => {
		const ast = byId("tasks", "task-1");
		expect(ast.collection).toBe("tasks");
		expect(ast.mode).toBe("one");
		expect(ast.where).toEqual({
			type: "predicate",
			predicate: { field: "id", op: "eq", value: "task-1" },
		});
	});

	test("byForeignKey builds many-mode eq predicate", () => {
		const ast = byForeignKey("tasks", "projectId", "proj-1");
		expect(ast.collection).toBe("tasks");
		expect(ast.mode).toBe("many");
		expect(ast.where).toEqual({
			type: "predicate",
			predicate: { field: "projectId", op: "eq", value: "proj-1" },
		});
	});
});
