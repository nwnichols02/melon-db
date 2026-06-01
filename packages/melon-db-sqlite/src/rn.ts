import type { StorageAdapter } from "@melon/db";
import { createSqliteAdapterFromDriver } from "./adapter-core.ts";
import {
	JSI_SQLITE_DEV_BUILD_MESSAGE,
	createNativeDriver,
} from "./drivers/native.ts";
import { resolveNativeDatabasePath } from "./native-path.ts";

export { JSI_SQLITE_DEV_BUILD_MESSAGE };

export interface JsiSqliteAdapterOptions {
	/** Database file name or absolute path. */
	filename: string;
	/** Directory prefix when filename is relative (e.g. expo documentDirectory). */
	basePath?: string;
	debug?: boolean;
}

/**
 * Returns true when the MelonSQLite native module is linked (not Expo Go).
 */
export function isJsiSqliteAvailable(): boolean {
	try {
		const reactNative = require("react-native") as {
			TurboModuleRegistry?: { get: (name: string) => unknown };
			NativeModules?: { MelonSQLite?: unknown };
		};
		if (reactNative.TurboModuleRegistry?.get("MelonSQLite") != null) {
			return true;
		}
		return reactNative.NativeModules?.MelonSQLite != null;
	} catch {
		return false;
	}
}

/**
 * Creates a SQLite StorageAdapter via Melon JSI native module (development build only).
 */
export function createJsiSqliteAdapter(
	options: JsiSqliteAdapterOptions,
): StorageAdapter {
	const { filename, basePath, debug } = options;
	const path = basePath
		? resolveNativeDatabasePath(filename, basePath)
		: filename;

	if (!isJsiSqliteAvailable()) {
		throw new Error(JSI_SQLITE_DEV_BUILD_MESSAGE);
	}

	return createSqliteAdapterFromDriver(() => createNativeDriver({ path }), {
		debug,
	});
}
