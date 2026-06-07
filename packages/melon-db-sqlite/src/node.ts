import type { QueryExecutionDebug, StorageAdapter } from "@melon-db/db";
import {
	type SqliteAdapterCoreOptions,
	createSqliteAdapterFromDriver,
} from "./adapter-core.ts";
import { createNodeDriver } from "./drivers/node.ts";

export interface NodeSqliteAdapterOptions extends SqliteAdapterCoreOptions {
	filename: string;
}

/**
 * Creates a SQLite StorageAdapter using better-sqlite3 (vanilla Node).
 */
export function createNodeSqliteAdapter(
	options: NodeSqliteAdapterOptions,
): StorageAdapter {
	return createSqliteAdapterFromDriver(
		() => createNodeDriver({ filename: options.filename }),
		{
			debug: options.debug,
			onQueryDebug: options.onQueryDebug,
		},
	);
}

export type { QueryExecutionDebug };
