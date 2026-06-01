import type { SqliteDriver } from "../driver.ts";
import { toSqlParams } from "../sql/bindings.ts";

export const JSI_SQLITE_DEV_BUILD_MESSAGE =
	"Melon JSI SQLite requires a development build. Use apps/playground-rn env/.env.development-build: bun run prebuild:dev && bun run run:ios:dev";

type NativeMelonModule = {
	open(path: string): Promise<void>;
	close(): Promise<void>;
	exec(sql: string): Promise<void>;
	queryAll(
		sql: string,
		params: ReadonlyArray<string | number | boolean | null>,
	): Promise<ReadonlyArray<Record<string, unknown>>>;
	queryFirst(
		sql: string,
		params: ReadonlyArray<string | number | boolean | null>,
	): Promise<Record<string, unknown> | null>;
	run(
		sql: string,
		params: ReadonlyArray<string | number | boolean | null>,
	): Promise<void>;
};

function bindParams(params: unknown[]): (string | number | boolean | null)[] {
	return toSqlParams(params) as (string | number | boolean | null)[];
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(row)) {
		out[key] = value === null || value === undefined ? null : value;
	}
	return out;
}

async function loadNativeModule(): Promise<NativeMelonModule> {
	const { getMelonSQLite, isMelonSQLiteNativeAvailable } = await import(
		"@melon/db-sqlite-native"
	);
	if (!isMelonSQLiteNativeAvailable()) {
		throw new Error(JSI_SQLITE_DEV_BUILD_MESSAGE);
	}
	const native = getMelonSQLite();
	if (!native) {
		throw new Error(JSI_SQLITE_DEV_BUILD_MESSAGE);
	}
	return native;
}

/**
 * Creates a SqliteDriver backed by @melon/db-sqlite-native (development build only).
 */
export async function createNativeDriver(options: {
	path: string;
}): Promise<SqliteDriver> {
	const native = await loadNativeModule();
	await native.open(options.path);

	return {
		async exec(sql: string): Promise<void> {
			await native.exec(sql);
		},

		async queryAll(
			sql: string,
			params: unknown[],
		): Promise<Record<string, unknown>[]> {
			const rows = await native.queryAll(sql, bindParams(params));
			return rows.map((row) => normalizeRow({ ...row }));
		},

		async queryFirst(
			sql: string,
			params: unknown[],
		): Promise<Record<string, unknown> | null> {
			const row = await native.queryFirst(sql, bindParams(params));
			if (row == null) {
				return null;
			}
			return normalizeRow({ ...row });
		},

		async run(sql: string, params: unknown[]): Promise<void> {
			await native.run(sql, bindParams(params));
		},

		async transaction<T>(fn: () => Promise<T>): Promise<T> {
			await native.exec("BEGIN");
			try {
				const result = await fn();
				await native.exec("COMMIT");
				return result;
			} catch (error) {
				await native.exec("ROLLBACK");
				throw error;
			}
		},

		async close(): Promise<void> {
			await native.close();
		},
	};
}
