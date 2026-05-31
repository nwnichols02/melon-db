import type { StorageAdapter } from "@melon/db";
import { createSqliteAdapterFromDriver } from "./adapter-core.ts";
import { type ExpoSqliteDatabase, createExpoDriver } from "./drivers/expo.ts";

export interface ExpoSqliteAdapterOptions {
	database: ExpoSqliteDatabase;
	debug?: boolean;
}

/**
 * Creates a SQLite StorageAdapter backed by expo-sqlite.
 */
export function createExpoSqliteAdapter(
	options: ExpoSqliteAdapterOptions,
): StorageAdapter {
	const { database, debug } = options;
	return createSqliteAdapterFromDriver(async () => createExpoDriver(database), {
		debug,
	});
}

export type { ExpoSqliteDatabase };
