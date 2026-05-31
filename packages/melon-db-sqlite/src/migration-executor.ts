import type {
	MelonSchema,
	MigrationStep,
	MigrationStepExecutor,
} from "@melon/db";
import type { SqliteDriver } from "./driver.ts";
import { generateAddColumnDdl, generateCollectionDdl } from "./schema-ddl.ts";

/**
 * Applies migration steps against a SQLite driver.
 */
export function createSqliteMigrationExecutor(
	driver: SqliteDriver,
): MigrationStepExecutor {
	return {
		async applyStep(step: MigrationStep, schema: MelonSchema): Promise<void> {
			if (step.type === "createTable") {
				const meta = schema.getCollection(step.collection);
				for (const ddl of generateCollectionDdl(meta)) {
					await driver.exec(ddl);
				}
				return;
			}

			if (step.type === "addColumns") {
				for (const ddl of generateAddColumnDdl(step.collection, step.fields)) {
					await driver.exec(ddl);
				}
				return;
			}

			if (step.type === "addIndexes") {
				const meta = schema.getCollection(step.collection);
				for (const index of step.indexes) {
					const indexName = `${meta.name}_${index.join("_")}_idx`;
					const cols = index.map((name) => `"${name}"`).join(", ");
					await driver.exec(
						`CREATE INDEX IF NOT EXISTS "${indexName}" ON "${meta.name}" (${cols})`,
					);
				}
			}
		},
	};
}
