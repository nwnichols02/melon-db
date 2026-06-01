import NativeMelonSQLite, {
	type MelonSQLiteSpec,
	type SqlParam,
} from "./NativeMelonSQLite.ts";

export type { MelonSQLiteSpec, SqlParam };

/**
 * Returns the native MelonSQLite TurboModule when linked in a development build.
 */
export function getMelonSQLite(): MelonSQLiteSpec | null {
	return NativeMelonSQLite;
}

/**
 * True when the MelonSQLite native module is present (not Expo Go).
 */
export function isMelonSQLiteNativeAvailable(): boolean {
	return NativeMelonSQLite != null;
}
