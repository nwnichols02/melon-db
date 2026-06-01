import {
	getMelonSQLiteModule,
	type MelonSQLiteNativeModule,
	type SqlParam,
} from "./MelonSQLiteBridge.ts";

export type { SqlParam };
/** @deprecated Use {@link MelonSQLiteNativeModule} */
export type MelonSQLiteSpec = MelonSQLiteNativeModule;
export type { MelonSQLiteNativeModule };
/** @deprecated Use {@link MelonSQLiteNativeModule} */
export type Spec = MelonSQLiteNativeModule;

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
