import {
	type MelonSQLiteNativeMode,
	type MelonSQLiteNativeModule,
	type SqlParam,
	getMelonSQLiteModule,
	getMelonSQLiteNativeMode,
} from "./MelonSQLiteBridge.ts";

export type { SqlParam };
export type { MelonSQLiteNativeMode };
export type { MelonSQLiteNativeModule };
export type { Spec } from "./NativeMelonSQLite.ts";
/** @deprecated Use {@link MelonSQLiteNativeModule} */
export type MelonSQLiteSpec = MelonSQLiteNativeModule;

export { getMelonSQLiteNativeMode };

/**
 * Returns the native MelonSQLite module when linked in a development build.
 */
export function getMelonSQLite(): MelonSQLiteNativeModule | null {
	return getMelonSQLiteModule();
}

/**
 * True when the MelonSQLite native module is present (not Expo Go).
 */
export function isMelonSQLiteNativeAvailable(): boolean {
	return getMelonSQLiteModule() != null;
}
