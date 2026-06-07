import { BenchTask, wdbAppSchema } from "@melon-db/db-sqlite/bench";
import type { Database as WdbDatabase } from "@nozbe/watermelondb";
import { File, Paths } from "expo-file-system";

const dbNames = new WeakMap<WdbDatabase, string>();

/**
 * Opens an isolated WatermelonDB instance for on-device benchmarks.
 */
export async function createRnWdbDatabase(dbName: string): Promise<WdbDatabase> {
	const { Database } = await import("@nozbe/watermelondb");
	const SQLiteAdapter = (await import("@nozbe/watermelondb/adapters/sqlite"))
		.default;

	const adapter = new SQLiteAdapter({
		schema: wdbAppSchema,
		dbName,
		jsi: true,
	});

	const database = new Database({
		adapter,
		modelClasses: [BenchTask],
	});
	dbNames.set(database, dbName);
	return database;
}

/**
 * Resets and removes the benchmark WatermelonDB file from app documents.
 */
export async function closeRnWdbDatabase(database: WdbDatabase): Promise<void> {
	await database.adapter.unsafeResetDatabase();
	const dbName = dbNames.get(database);
	if (dbName) {
		try {
			const file = new File(Paths.document, dbName);
			if (file.exists) {
				file.delete();
			}
		} catch {
			// Best-effort file removal after adapter reset.
		}
		dbNames.delete(database);
	}
}
