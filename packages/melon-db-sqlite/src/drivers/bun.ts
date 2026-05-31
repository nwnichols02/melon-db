import { Database, type SQLQueryBindings } from "bun:sqlite";
import type { SqliteDriver } from "../driver.ts";
import { toSqlParams } from "../sql/bindings.ts";

export interface BunDriverOptions {
	filename: string;
}

/**
 * Creates a bun:sqlite driver for Node/Bun environments.
 */
export function createBunDriver(
	options: BunDriverOptions,
): Promise<SqliteDriver> {
	const db = new Database(options.filename);

	const driver: SqliteDriver = {
		async exec(sql: string): Promise<void> {
			db.exec(sql);
		},

		async queryAll(
			sql: string,
			params: unknown[],
		): Promise<Record<string, unknown>[]> {
			const stmt = db.query(sql);
			return stmt.all(...(toSqlParams(params) as SQLQueryBindings[])) as Record<
				string,
				unknown
			>[];
		},

		async queryFirst(
			sql: string,
			params: unknown[],
		): Promise<Record<string, unknown> | null> {
			const stmt = db.query(sql);
			const row = stmt.get(
				...(toSqlParams(params) as SQLQueryBindings[]),
			) as Record<string, unknown> | null;
			return row ?? null;
		},

		async run(sql: string, params: unknown[]): Promise<void> {
			db.query(sql).run(...(toSqlParams(params) as SQLQueryBindings[]));
		},

		async transaction<T>(fn: () => Promise<T>): Promise<T> {
			db.exec("BEGIN");
			try {
				const result = await fn();
				db.exec("COMMIT");
				return result;
			} catch (error) {
				db.exec("ROLLBACK");
				throw error;
			}
		},

		async close(): Promise<void> {
			db.close();
		},
	};

	return Promise.resolve(driver);
}
