import type { SqliteDriver } from "../driver.ts";
import { toSqlParams } from "../sql/bindings.ts";

export const JSI_SYNC_SQLITE_MESSAGE =
	"Melon sync JSI SQLite requires a development build on iOS or Android. Set mode: 'turbo' or use @melon/db-sqlite/expo.";

type MelonSqliteJsiHostObject = {
	openSync(path: string): void;
	closeSync(): void;
	execSync(sql: string): void;
	queryAllSync(
		sql: string,
		params?: ReadonlyArray<string | number | boolean | null>,
	): ReadonlyArray<Record<string, unknown>>;
	queryFirstSync(
		sql: string,
		params?: ReadonlyArray<string | number | boolean | null>,
	): Record<string, unknown> | null;
	runSync(
		sql: string,
		params?: ReadonlyArray<string | number | boolean | null>,
	): void;
	setObservationFlushCallback(callback: () => void): void;
	removeObservationFlushCallback(): void;
};

function getJsiHostObject(): MelonSqliteJsiHostObject {
	const jsi = (
		globalThis as typeof globalThis & {
			melonSqliteJsi?: MelonSqliteJsiHostObject;
		}
	).melonSqliteJsi;
	if (jsi == null || typeof jsi.openSync !== "function") {
		throw new Error(JSI_SYNC_SQLITE_MESSAGE);
	}
	return jsi;
}

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

/**
 * Creates a SqliteDriver backed by sync C++ JSI (iOS/Android development builds).
 */
export async function createNativeJsiSyncDriver(options: {
	path: string;
}): Promise<SqliteDriver> {
	const jsi = getJsiHostObject();
	jsi.openSync(options.path);

	return {
		async exec(sql: string): Promise<void> {
			jsi.execSync(sql);
		},

		async queryAll(
			sql: string,
			params: unknown[],
		): Promise<Record<string, unknown>[]> {
			const rows = jsi.queryAllSync(sql, bindParams(params));
			return rows.map((row) => normalizeRow({ ...row }));
		},

		async queryFirst(
			sql: string,
			params: unknown[],
		): Promise<Record<string, unknown> | null> {
			const row = jsi.queryFirstSync(sql, bindParams(params));
			if (row == null) {
				return null;
			}
			return normalizeRow({ ...row });
		},

		async run(sql: string, params: unknown[]): Promise<void> {
			jsi.runSync(sql, bindParams(params));
		},

		async transaction<T>(fn: () => Promise<T>): Promise<T> {
			jsi.execSync("BEGIN");
			try {
				const result = await fn();
				jsi.execSync("COMMIT");
				return result;
			} catch (error) {
				jsi.execSync("ROLLBACK");
				throw error;
			}
		},

		async close(): Promise<void> {
			jsi.closeSync();
		},
	};
}

/**
 * Returns true when sync C++ JSI host object is installed.
 */
export function isNativeJsiSyncAvailable(): boolean {
	return (
		typeof globalThis !== "undefined" &&
		typeof globalThis.melonSqliteJsi === "object" &&
		globalThis.melonSqliteJsi != null &&
		typeof globalThis.melonSqliteJsi.openSync === "function"
	);
}
