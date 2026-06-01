export type MelonRuntimeEnv = "expo-go" | "development-build";

const RUNTIME_CONFIG = {
	"expo-go": {
		databaseFilename: "melon-playground.db",
		displayName: "Expo Go",
	},
	"development-build": {
		databaseFilename: "melon-playground-dev.db",
		displayName: "Development build (JSI)",
	},
} as const satisfies Record<
	MelonRuntimeEnv,
	{ databaseFilename: string; displayName: string }
>;

/**
 * Active Melon playground runtime (from EXPO_PUBLIC_MELON_RUNTIME).
 */
export function getMelonRuntime(): MelonRuntimeEnv {
	const value = process.env.EXPO_PUBLIC_MELON_RUNTIME;
	if (value === "development-build") {
		return "development-build";
	}
	return "expo-go";
}

/**
 * True when the development-build env file was used (JSI native SQLite).
 */
export function isDevelopmentBuildRuntime(): boolean {
	return getMelonRuntime() === "development-build";
}

/**
 * Per-environment labels and database filename.
 */
export function getMelonRuntimeConfig(): (typeof RUNTIME_CONFIG)[MelonRuntimeEnv] {
	return RUNTIME_CONFIG[getMelonRuntime()];
}
