import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { migrateQueries } from "../src/codemods/migrate-queries.ts";

describe("melon-codemod CLI", () => {
	test("migrate-queries dry-run on fixtures dir", () => {
		const result = migrateQueries({
			path: join(import.meta.dir, "../__fixtures__"),
			dryRun: true,
		});
		expect(result.errors).toEqual([]);
	});
});
