import Database from "@nozbe/watermelondb/Database";
import Model from "@nozbe/watermelondb/Model";
import { appSchema, tableSchema } from "@nozbe/watermelondb/Schema";
import SQLiteAdapter from "@nozbe/watermelondb/adapters/sqlite";

export class Task extends Model {
	static table = "tasks";
}

export const wdbAppSchema = appSchema({
	version: 1,
	tables: [
		tableSchema({
			name: "tasks",
			columns: [
				{ name: "status", type: "string" },
				{ name: "priority", type: "number", isOptional: true },
			],
		}),
	],
});

let wdbCounter = 0;

/**
 * Creates an in-memory WatermelonDB instance for benchmarks.
 */
export function createWdbDatabase(): Database {
	wdbCounter += 1;
	const adapter = new SQLiteAdapter({
		schema: wdbAppSchema,
		dbName: `:memory:bench_${wdbCounter}`,
	});

	return new Database({
		adapter,
		modelClasses: [Task],
	});
}

/**
 * Closes the underlying SQLite adapter connection.
 */
export async function closeWdbDatabase(database: Database): Promise<void> {
	await database.adapter.unsafeResetDatabase();
}
