import { mkdtempSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Database as WdbDatabase } from "@nozbe/watermelondb";

const require = createRequire(import.meta.url);

const { Database, Model, appSchema, tableSchema } =
	require("@nozbe/watermelondb") as typeof import("@nozbe/watermelondb");

const SQLiteAdapter = require("@nozbe/watermelondb/adapters/sqlite")
	.default as typeof import("@nozbe/watermelondb/adapters/sqlite").default;

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

const wdbTempDirs = new WeakMap<WdbDatabase, string>();

/**
 * Creates an isolated WatermelonDB instance for benchmarks (temp SQLite file).
 */
export function createWdbDatabase(): WdbDatabase {
	const dir = mkdtempSync(join(tmpdir(), "melon-wdb-bench-"));
	const dbPath = join(dir, "bench.sqlite");
	const adapter = new SQLiteAdapter({
		schema: wdbAppSchema,
		dbName: dbPath,
	});

	const database = new Database({
		adapter,
		modelClasses: [Task],
	});
	wdbTempDirs.set(database, dir);
	return database;
}

/**
 * Closes the underlying SQLite adapter connection.
 */
export async function closeWdbDatabase(database: WdbDatabase): Promise<void> {
	await database.adapter.unsafeResetDatabase();
	const dir = wdbTempDirs.get(database);
	if (dir) {
		rmSync(dir, { recursive: true, force: true });
		wdbTempDirs.delete(database);
	}
}
