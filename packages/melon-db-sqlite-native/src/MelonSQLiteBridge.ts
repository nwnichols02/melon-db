import { NativeModules } from "react-native";

export type SqlParam = string | number | boolean | null;

/**
 * Bridge module contract for MelonSQLite (RCT on iOS, ReactContextBaseJavaModule on Android).
 * Not a TurboModule spec — avoids New Architecture JNI codegen until C++ impl lands.
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

const melonSQLite = NativeModules.MelonSQLite as
	| MelonSQLiteNativeModule
	| undefined;

/**
 * Returns the MelonSQLite bridge module when linked in a development build.
 */
export function getMelonSQLiteModule(): MelonSQLiteNativeModule | null {
	return melonSQLite ?? null;
}
