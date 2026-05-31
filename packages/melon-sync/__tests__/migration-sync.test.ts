import { describe, expect, test } from "bun:test";
import type { Migration } from "@melon/db";
import { buildPullMigration } from "../src/migration-sync.ts";

describe("buildPullMigration", () => {
	test("collects tables and columns from migrations after fromVersion", () => {
		const migrations: Migration[] = [
			{
				toVersion: 2,
				steps: [
					{ type: "createTable", collection: "projects" },
					{
						type: "addColumns",
						collection: "tasks",
						fields: { dueDate: { kind: "date", nullable: true } },
					},
				],
			},
		];

		const result = buildPullMigration(migrations, 1, 2);
		expect(result).toEqual({
			from: 1,
			tables: ["projects"],
			columns: [{ table: "tasks", columns: ["dueDate"] }],
		});
	});
});
