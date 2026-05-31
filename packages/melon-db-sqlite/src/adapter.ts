import type { QueryExecutionDebug, StorageAdapter } from "@melon/db";
import { createSqliteAdapterFromDriver } from "./adapter-core.ts";
import { createBunDriver } from "./drivers/bun.ts";

export interface SqliteAdapterOptions {
	filename: string;
	debug?: boolean;
	onQueryDebug?: (debug: QueryExecutionDebug) => void;
}

/**
 * Creates a SQLite StorageAdapter using bun:sqlite (Node/Bun).
 */
export function createSqliteAdapter(
	options: SqliteAdapterOptions,
): StorageAdapter {
	return createSqliteAdapterFromDriver(
		() => createBunDriver({ filename: options.filename }),
		{ debug: options.debug, onQueryDebug: options.onQueryDebug },
	);
}
