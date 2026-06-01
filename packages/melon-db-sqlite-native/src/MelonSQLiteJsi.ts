import type { SqlParam } from "./MelonSQLiteBridge.ts";

declare global {
	var melonSqliteJsi: MelonSqliteJsiHostObject | undefined;
}

/**
 * Sync C++ JSI host object installed as global.melonSqliteJsi (iOS dev build).
 */
export interface MelonSqliteJsiHostObject {
	openSync(path: string): void;
	closeSync(): void;
	execSync(sql: string): void;
	queryAllSync(
		sql: string,
		params?: ReadonlyArray<SqlParam>,
	): ReadonlyArray<Record<string, unknown>>;
	queryFirstSync(
		sql: string,
		params?: ReadonlyArray<SqlParam>,
	): Record<string, unknown> | null;
	runSync(sql: string, params?: ReadonlyArray<SqlParam>): void;
}

/**
 * Returns true when the sync C++ JSI host object is installed (iOS only today).
 */
export function isMelonSqliteJsiInstalled(): boolean {
	return (
		typeof globalThis !== "undefined" &&
		typeof globalThis.melonSqliteJsi === "object" &&
		globalThis.melonSqliteJsi != null &&
		typeof globalThis.melonSqliteJsi.openSync === "function"
	);
}

/**
 * Returns the sync JSI host object or null when unavailable.
 */
export function getMelonSqliteJsi(): MelonSqliteJsiHostObject | null {
	if (!isMelonSqliteJsiInstalled()) {
		return null;
	}
	return globalThis.melonSqliteJsi ?? null;
}

/**
 * Returns the sync JSI host object or throws when unavailable.
 */
export function requireMelonSqliteJsi(): MelonSqliteJsiHostObject {
	const jsi = getMelonSqliteJsi();
	if (jsi == null) {
		throw new Error(
			"Melon sync JSI SQLite is not installed. Use a development build on iOS or set mode: 'turbo'.",
		);
	}
	return jsi;
}
