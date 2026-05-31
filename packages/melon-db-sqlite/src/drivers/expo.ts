import type { SqliteDriver } from "../driver.ts";
import { toSqlParams } from "../sql/bindings.ts";

/**
 * Subset of expo-sqlite SQLiteDatabase used by the Melon adapter.
 */
export interface ExpoSqliteDatabase {
	execAsync(source: string): Promise<void>;
	getAllAsync<T>(
		source: string,
		...params: (string | number | null | boolean | Uint8Array)[]
	): Promise<T[]>;
	getFirstAsync<T>(
		source: string,
		...params: (string | number | null | boolean | Uint8Array)[]
	): Promise<T | null>;
	runAsync(
		source: string,
		...params: (string | number | null | boolean | Uint8Array)[]
	): Promise<unknown>;
	closeAsync?(): Promise<void>;
}

function bindParams(params: unknown[]): (string | number | null | boolean)[] {
	return toSqlParams(params) as (string | number | null | boolean)[];
}

/**
 * Creates an expo-sqlite driver for React Native environments.
 */
export function createExpoDriver(database: ExpoSqliteDatabase): SqliteDriver {
	return {
		async exec(sql: string): Promise<void> {
			await database.execAsync(sql);
		},

		async queryAll(
			sql: string,
			params: unknown[],
		): Promise<Record<string, unknown>[]> {
			const rows = await database.getAllAsync<Record<string, unknown>>(
				sql,
				...bindParams(params),
			);
			return rows;
		},

		async queryFirst(
			sql: string,
			params: unknown[],
		): Promise<Record<string, unknown> | null> {
			const row = await database.getFirstAsync<Record<string, unknown>>(
				sql,
				...bindParams(params),
			);
			return row ?? null;
		},

		async run(sql: string, params: unknown[]): Promise<void> {
			await database.runAsync(sql, ...bindParams(params));
		},

		async transaction<T>(fn: () => Promise<T>): Promise<T> {
			await database.execAsync("BEGIN");
			try {
				const result = await fn();
				await database.execAsync("COMMIT");
				return result;
			} catch (error) {
				await database.execAsync("ROLLBACK");
				throw error;
			}
		},

		async close(): Promise<void> {
			await database.closeAsync?.();
		},
	};
}
