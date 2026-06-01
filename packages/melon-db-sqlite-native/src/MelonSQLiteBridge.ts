import { NativeModules, TurboModuleRegistry } from "react-native";
import type { Spec } from "./NativeMelonSQLite.ts";

export type SqlParam = string | number | boolean | null;

/**
 * Native SQLite module contract (TurboModule on iOS/Android when New Architecture is enabled).
 */
export interface MelonSQLiteNativeModule {
	open(path: string): Promise<void>;
	close(): Promise<void>;
	exec(sql: string): Promise<void>;
	queryAll(
		sql: string,
		params: ReadonlyArray<SqlParam>,
	): Promise<ReadonlyArray<Record<string, unknown>>>;
	queryFirst(
		sql: string,
		params: ReadonlyArray<SqlParam>,
	): Promise<Record<string, unknown> | null>;
	run(sql: string, params: ReadonlyArray<SqlParam>): Promise<void>;
}

export type MelonSQLiteNativeMode = "turbo" | "bridge";

function resolveModule(): {
	module: MelonSQLiteNativeModule;
	mode: MelonSQLiteNativeMode;
} | null {
	const turbo = TurboModuleRegistry.get<Spec>("MelonSQLite");
	if (turbo != null) {
		return { module: turbo, mode: "turbo" };
	}
	const bridge = NativeModules.MelonSQLite as
		| MelonSQLiteNativeModule
		| undefined;
	if (bridge != null) {
		return { module: bridge, mode: "bridge" };
	}
	return null;
}

/**
 * Returns how MelonSQLite is linked (turbo vs legacy bridge), or null when unavailable.
 */
export function getMelonSQLiteNativeMode(): MelonSQLiteNativeMode | null {
	return resolveModule()?.mode ?? null;
}

/**
 * Returns the MelonSQLite native module when linked in a development build.
 */
export function getMelonSQLiteModule(): MelonSQLiteNativeModule | null {
	return resolveModule()?.module ?? null;
}
