import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SyntaxKind } from "ts-morph";
import {
	applyMigrateQueriesTransform,
	applyMigrateReactTransform,
	applyMigrateWritesTransform,
	buildFromQExpr,
	createInMemoryProject,
	describeQOnMigration,
	extractSchemaFromSourceFile,
	normalizeCode,
} from "../src/index.ts";

const FIXTURES = join(import.meta.dir, "../__fixtures__");

function readFixture(name: string): string {
	return readFileSync(join(FIXTURES, name), "utf8");
}

function runTransform(
	beforeName: string,
	transform: (
		sourceFile: import("ts-morph").SourceFile,
		result: import("../src/codemods/runner.ts").CodemodResult,
	) => void,
): string {
	const before = readFixture(beforeName);
	const { sourceFile } = createInMemoryProject(`/${beforeName}`, before);
	const result = { filesChanged: 0, warnings: [], errors: [] };
	transform(sourceFile, result);
	expect(result.errors).toEqual([]);
	return sourceFile.getFullText();
}

describe("codemod fixtures", () => {
	test("migrate-queries matches expected output", () => {
		const output = runTransform("queries-before.ts", (sourceFile, result) => {
			applyMigrateQueriesTransform(sourceFile, {}, result);
		});
		const expected = readFixture("queries-after.ts");
		expect(normalizeCode(output)).toBe(normalizeCode(expected));
	});

	test("migrate-queries and/or + fetch/observe", () => {
		const output = runTransform(
			"queries-and-or-before.ts",
			(sourceFile, result) => {
				applyMigrateQueriesTransform(sourceFile, {}, result);
			},
		);
		const expected = readFixture("queries-and-or-after.ts");
		expect(normalizeCode(output)).toBe(normalizeCode(expected));
	});

	test("migrate-queries Q.on emits recipe comment", () => {
		const before = readFixture("queries-q-on-before.ts");
		const { sourceFile } = createInMemoryProject(
			"/queries-q-on-before.ts",
			before,
		);
		const result: import("../src/codemods/runner.ts").CodemodResult = {
			filesChanged: 0,
			warnings: [],
			errors: [],
		};
		applyMigrateQueriesTransform(sourceFile, {}, result);
		const output = sourceFile.getFullText();
		const expected = readFixture("queries-q-on-after.ts");
		expect(normalizeCode(output)).toBe(normalizeCode(expected));
		expect(result.warnings.some((w: string) => w.includes("Q.on"))).toBe(true);
	});

	test("migrate-writes matches expected output", () => {
		const output = runTransform("writes-before.ts", (sourceFile, result) => {
			applyMigrateWritesTransform(sourceFile, {}, result);
		});
		const expected = readFixture("writes-after.ts");
		expect(normalizeCode(output)).toBe(normalizeCode(expected));
	});

	test("migrate-writes delete", () => {
		const output = runTransform(
			"writes-delete-before.ts",
			(sourceFile, result) => {
				applyMigrateWritesTransform(sourceFile, {}, result);
			},
		);
		const expected = readFixture("writes-delete-after.ts");
		expect(normalizeCode(output)).toBe(normalizeCode(expected));
	});

	test("migrate-writes batch", () => {
		const output = runTransform(
			"writes-batch-before.ts",
			(sourceFile, result) => {
				applyMigrateWritesTransform(sourceFile, {}, result);
			},
		);
		const expected = readFixture("writes-batch-after.ts");
		expect(normalizeCode(output)).toBe(normalizeCode(expected));
	});

	test("migrate-react matches expected output", () => {
		const output = runTransform("react-before.tsx", (sourceFile, result) => {
			applyMigrateReactTransform(sourceFile, result);
		});
		const expected = readFixture("react-after.tsx");
		expect(normalizeCode(output)).toBe(normalizeCode(expected));
	});

	test("migrate-react withObservables", () => {
		const output = runTransform(
			"react-with-observables-before.tsx",
			(sourceFile, result) => {
				applyMigrateReactTransform(sourceFile, result);
			},
		);
		const expected = readFixture("react-with-observables-after.tsx");
		expect(normalizeCode(output)).toBe(normalizeCode(expected));
	});
});

describe("buildFromQExpr", () => {
	test("builds nested and/or filters", () => {
		const { sourceFile } = createInMemoryProject(
			"/q.ts",
			`const x = Q.and(Q.where('a', '1'), Q.or(Q.where('b', Q.gt(2)), Q.where('c', Q.lt(1))))`,
		);
		const call = sourceFile
			.getDescendantsOfKind(SyntaxKind.CallExpression)
			.find((c) => c.getText().startsWith("Q.and"));
		if (!call) {
			throw new Error("expected Q.and call");
		}
		const warnings: string[] = [];
		const part = buildFromQExpr(call, warnings);
		expect(part).toContain(".and(q2 => q2");
		expect(part).toContain(".or(q2 => q2");
		expect(warnings).toHaveLength(0);
	});
});

describe("describeQOnMigration", () => {
	test("returns recipe steps", () => {
		const recipe = describeQOnMigration({
			parentCollection: "tasks",
			relatedTable: "projects",
		});
		expect(recipe.steps.length).toBeGreaterThan(0);
		expect(recipe.summary).toContain("tasks");
	});
});

describe("migrate-schema", () => {
	test("extracts schema from model file", () => {
		const before = readFixture("schema-model-before.ts");
		const { sourceFile } = createInMemoryProject(
			"/schema-model-before.ts",
			before,
		);
		const schema = extractSchemaFromSourceFile(sourceFile);
		const expected = JSON.parse(readFixture("schema-model-expected.json"));
		expect(schema).toEqual(expected);
	});
});

describe("codemod ignore marker", () => {
	test("skips files with @melon-codemod-ignore", () => {
		const content =
			"// @melon-codemod-ignore\ndatabase.get('tasks').query(Q.where('status', 'open'));";
		const { sourceFile } = createInMemoryProject("/ignored.ts", content);
		const result = { filesChanged: 0, warnings: [], errors: [] };
		applyMigrateQueriesTransform(sourceFile, {}, result);
		expect(sourceFile.getFullText()).toBe(content);
	});
});
