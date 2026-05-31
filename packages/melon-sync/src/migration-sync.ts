import type { Migration } from "@melon/db";
import type { PullMigration } from "./protocol.ts";

/**
 * Builds Watermelon-style migration metadata for pull requests after a schema upgrade.
 */
export function buildPullMigration(
	migrations: Migration[],
	fromVersion: number,
	toVersion: number,
): PullMigration {
	const tables: string[] = [];
	const columns: Array<{ table: string; columns: string[] }> = [];

	for (const migration of migrations) {
		if (migration.toVersion <= fromVersion || migration.toVersion > toVersion) {
			continue;
		}

		for (const step of migration.steps) {
			if (step.type === "createTable") {
				tables.push(step.collection);
			}
			if (step.type === "addColumns") {
				columns.push({
					table: step.collection,
					columns: Object.keys(step.fields),
				});
			}
		}
	}

	return { from: fromVersion, tables, columns };
}
