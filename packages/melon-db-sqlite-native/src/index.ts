import NativeMelonSQLite, {
	type Spec,
	type SqlParam,
} from "./NativeMelonSQLite.ts";

export type { SqlParam };
/** @deprecated Use {@link Spec} — kept for callers that used the old name. */
export type MelonSQLiteSpec = Spec;
export type { Spec };

/**
 * Returns the native MelonSQLite TurboModule when linked in a development build.
 */
export function getMelonSQLite(): Spec | null {
	return NativeMelonSQLite;
}

/**
 * True when the MelonSQLite native module is present (not Expo Go).
 */
export function isMelonSQLiteNativeAvailable(): boolean {
	return NativeMelonSQLite != null;
}
