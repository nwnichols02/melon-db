/**
 * Platform-neutral SQLite execution surface used by adapter-core.
 */
export interface SqliteDriver {
	exec(sql: string): Promise<void>;
	queryAll(sql: string, params: unknown[]): Promise<Record<string, unknown>[]>;
	queryFirst(
		sql: string,
		params: unknown[],
	): Promise<Record<string, unknown> | null>;
	run(sql: string, params: unknown[]): Promise<void>;
	transaction<T>(fn: () => Promise<T>): Promise<T>;
	close(): Promise<void>;
}

export interface SqliteDriverFactory {
	create(): Promise<SqliteDriver>;
}
