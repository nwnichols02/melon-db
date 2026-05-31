import type { MigrationAdapterHooks } from "./types.ts";
import {
	CREATE_META_TABLE_SQL,
	META_TABLE,
	SCHEMA_VERSION_KEY,
} from "./types.ts";

/**
 * Creates migration hooks backed by raw SQL execution.
 */
export function createSqlMigrationHooks(
	execSql: (sql: string) => Promise<void>,
	queryFirst: (
		sql: string,
		params?: unknown[],
	) => Promise<Record<string, unknown> | null>,
	run: (sql: string, params?: unknown[]) => Promise<void>,
): MigrationAdapterHooks {
	return {
		execSql,
		async getMeta(key: string): Promise<string | null> {
			const row = await queryFirst(
				`SELECT value FROM "${META_TABLE}" WHERE key = ?`,
				[key],
			);
			const value = row?.value;
			return typeof value === "string" ? value : null;
		},
		async setMeta(key: string, value: string): Promise<void> {
			await run(
				`INSERT INTO "${META_TABLE}" (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
				[key, value],
			);
		},
	};
}

/**
 * Ensures the meta table exists and returns SQL migration hooks.
 */
export async function ensureMetaTable(
	execSql: (sql: string) => Promise<void>,
	queryFirst: (
		sql: string,
		params?: unknown[],
	) => Promise<Record<string, unknown> | null>,
	run: (sql: string, params?: unknown[]) => Promise<void>,
): Promise<MigrationAdapterHooks> {
	await execSql(CREATE_META_TABLE_SQL);
	return createSqlMigrationHooks(execSql, queryFirst, run);
}

export { SCHEMA_VERSION_KEY };
