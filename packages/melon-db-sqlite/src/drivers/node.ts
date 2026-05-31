import type { SqliteDriver } from "../driver.ts";
import { toSqlParams } from "../sql/bindings.ts";

export interface NodeDriverOptions {
	filename: string;
}

interface BetterSqliteDatabase {
	exec(sql: string): void;
	prepare(sql: string): BetterSqliteStatement;
	close(): void;
}

interface BetterSqliteStatement {
	all(...params: unknown[]): Record<string, unknown>[];
	get(...params: unknown[]): Record<string, unknown> | undefined;
	run(...params: unknown[]): void;
}

/**
 * Creates a better-sqlite3 driver for vanilla Node environments.
 */
export async function createNodeDriver(
	options: NodeDriverOptions,
): Promise<SqliteDriver> {
	const BetterSqlite3 = (await import("better-sqlite3")).default as new (
		filename: string,
	) => BetterSqliteDatabase;

	const db = new BetterSqlite3(options.filename);

	const driver: SqliteDriver = {
		async exec(sql: string): Promise<void> {
			db.exec(sql);
		},

		async queryAll(
			sql: string,
			params: unknown[],
		): Promise<Record<string, unknown>[]> {
			return db.prepare(sql).all(...toSqlParams(params)) as Record<
				string,
				unknown
			>[];
		},

		async queryFirst(
			sql: string,
			params: unknown[],
		): Promise<Record<string, unknown> | null> {
			const row = db.prepare(sql).get(...toSqlParams(params)) as
				| Record<string, unknown>
				| undefined;
			return row ?? null;
		},

		async run(sql: string, params: unknown[]): Promise<void> {
			db.prepare(sql).run(...toSqlParams(params));
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

	return driver;
}
