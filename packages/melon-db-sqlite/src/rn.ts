import type { StorageAdapter } from "@melon/db";
import { createSqliteAdapterFromDriver } from "./adapter-core.ts";
import {
	createNativeJsiSyncDriver,
	isNativeJsiSyncAvailable,
} from "./drivers/native-jsi-sync.ts";
import {
	JSI_SQLITE_DEV_BUILD_MESSAGE,
	createNativeDriver,
} from "./drivers/native.ts";
import { resolveNativeDatabasePath } from "./native-path.ts";

export { JSI_SQLITE_DEV_BUILD_MESSAGE };
export { JSI_SYNC_SQLITE_MESSAGE } from "./drivers/native-jsi-sync.ts";

export type JsiSqliteAdapterMode = "auto" | "jsi-sync" | "turbo";

export interface JsiSqliteAdapterOptions {
	/** Database file name or absolute path. */
	filename: string;
	/** Directory prefix when filename is relative (e.g. expo documentDirectory). */
	basePath?: string;
	debug?: boolean;
	/** Driver selection: auto prefers sync JSI when installed (iOS). */
	mode?: JsiSqliteAdapterMode;
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
 * Returns true when sync C++ JSI host object is installed.
 */
export function isJsiSyncSqliteAvailable(): boolean {
	return isNativeJsiSyncAvailable();
}

function resolveDriverFactory(
	mode: JsiSqliteAdapterMode,
	path: string,
): () => Promise<import("./driver.ts").SqliteDriver> {
	if (mode === "jsi-sync") {
		return () => createNativeJsiSyncDriver({ path });
	}
	if (mode === "turbo") {
		return () => createNativeDriver({ path });
	}
	if (isNativeJsiSyncAvailable()) {
		return () => createNativeJsiSyncDriver({ path });
	}
	return () => createNativeDriver({ path });
}

/**
 * Creates a SQLite StorageAdapter via Melon JSI native module (development build only).
 */
export function createJsiSqliteAdapter(
	options: JsiSqliteAdapterOptions,
): StorageAdapter {
	const { filename, basePath, debug, mode = "auto" } = options;
	const path = basePath
		? resolveNativeDatabasePath(filename, basePath)
		: filename;

	if (mode === "jsi-sync" && !isNativeJsiSyncAvailable()) {
		throw new Error(
			"Melon sync JSI SQLite is not installed. Use mode: 'turbo' or a development build on iOS.",
		);
	}

	if (mode === "turbo" && !isJsiSqliteAvailable()) {
		throw new Error(JSI_SQLITE_DEV_BUILD_MESSAGE);
	}

	if (
		mode === "auto" &&
		!isNativeJsiSyncAvailable() &&
		!isJsiSqliteAvailable()
	) {
		throw new Error(JSI_SQLITE_DEV_BUILD_MESSAGE);
	}

	return createSqliteAdapterFromDriver(resolveDriverFactory(mode, path), {
		debug,
	});
}
