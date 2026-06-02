import { describe, expect, test } from "bun:test";
import { createMelonSchema } from "@melon/db";
import { createMangoCompiler } from "../src/compiler.ts";

const schema = createMelonSchema({
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			fields: { status: { kind: "string" }, priority: { kind: "number" } },
		},
	},
});

describe("createMangoCompiler", () => {
	test("compiles equality selector", () => {
		const compiler = createMangoCompiler();
		const prepared = compiler.compile(
			{ selector: { status: "open" } },
			"tasks",
			schema,
		);
		expect(prepared.source).toBe("mango");
		expect(prepared.ast.where?.type).toBe("predicate");
	});

	test("compiles comparison operators", () => {
		const compiler = createMangoCompiler();
		const prepared = compiler.compile(
			{ selector: { priority: { $gte: 2 } } },
			"tasks",
			schema,
		);
		expect(prepared.ast.where?.type).toBe("predicate");
	});

	test("compiles findOne mode", () => {
		const compiler = createMangoCompiler();
		const prepared = compiler.compile(
			{ selector: { status: "open" }, mode: "one", limit: 5 },
			"tasks",
			schema,
		);
		expect(prepared.ast.mode).toBe("one");
		expect(prepared.ast.limit).toBe(5);
	});

	test("compiles count mode", () => {
		const compiler = createMangoCompiler();
		const prepared = compiler.compile(
			{ selector: { status: "open" }, mode: "count" },
			"tasks",
			schema,
		);
		expect(prepared.ast.mode).toBe("count");
	});
});
