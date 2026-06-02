import {
	cleanupBenchDatabaseFiles,
	createBenchFilenameAllocator,
} from "@/bench/bench-db";
import {
	resumeDatabaseAfterNativeBench,
	suspendDatabaseForNativeBench,
} from "@/db/bootstrap";
import type { StorageAdapter } from "@melon/db";
import {
	type BenchResult,
	type RnParityReport,
	buildRnParityReport,
	runScenariosForAdapter,
} from "@melon/db-sqlite/bench";
import {
	createJsiSqliteAdapter,
	isJsiSqliteAvailable,
} from "@melon/db-sqlite/rn";
import { Platform } from "react-native";

export type DeviceBenchMode = "jsi-sync" | "turbo" | "expo";
export type DeviceBenchScale = 1_000 | 10_000;

function usesNativeSqliteSingleton(mode: DeviceBenchMode): boolean {
	return mode === "jsi-sync" || mode === "turbo";
}

function needsNativeExclusiveAccess(modes: DeviceBenchMode[]): boolean {
	return modes.some(usesNativeSqliteSingleton);
}

function engineLabelForMode(mode: DeviceBenchMode): string {
	if (mode === "jsi-sync") {
		return "melon-jsi-sync";
	}
	if (mode === "turbo") {
		return "melon-turbo";
	}
	return "melon-expo";
}

function createNativeAdapter(
	mode: "jsi-sync" | "turbo",
	basePath: string,
	filename: string,
): StorageAdapter {
	if (!isJsiSqliteAvailable()) {
		throw new Error(
			"Melon JSI SQLite requires a native binary. Run install:ios or install:android from playground-rn-dev.",
		);
	}
	return createJsiSqliteAdapter({
		filename,
		basePath,
		mode,
	});
}

async function createExpoBenchAdapter(filename: string): Promise<StorageAdapter> {
	const SQLite = await import("expo-sqlite");
	const { createExpoSqliteAdapter } = await import("@melon/db-sqlite/expo");
	const database = await SQLite.openDatabaseAsync(filename);
	return createExpoSqliteAdapter({ database });
}

async function runModeScenarios(
	mode: DeviceBenchMode,
	scale: DeviceBenchScale,
	basePath: string,
	nextBenchFilename: (label: string) => string,
): Promise<BenchResult[]> {
	if (mode === "expo") {
		return runScenariosForAdapter(
			() => createExpoBenchAdapter(nextBenchFilename("expo")),
			scale,
			engineLabelForMode(mode),
		);
	}

	return runScenariosForAdapter(
		() => createNativeAdapter(mode, basePath, nextBenchFilename(mode)),
		scale,
		engineLabelForMode(mode),
	);
}

/**
 * Runs on-device benchmark scenarios for the given native/expo modes.
 */
export async function runDeviceBenchmark(options: {
	modes: DeviceBenchMode[];
	scale: DeviceBenchScale;
	basePath: string;
	onProgress?: (label: string) => void;
}): Promise<{ results: BenchResult[]; report: RnParityReport }> {
	const { modes, scale, basePath, onProgress } = options;
	const allResults: BenchResult[] = [];
	const exclusiveNative = needsNativeExclusiveAccess(modes);

	onProgress?.("Cleaning prior benchmark databases…");
	await cleanupBenchDatabaseFiles();

	const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
	const { next: nextBenchFilename } = createBenchFilenameAllocator(runId);

	if (exclusiveNative) {
		onProgress?.("Releasing app database for native bench…");
		await suspendDatabaseForNativeBench();
	}

	try {
		for (const mode of modes) {
			onProgress?.(`Running ${mode} @ ${scale.toLocaleString()}…`);
			const results = await runModeScenarios(
				mode,
				scale,
				basePath,
				nextBenchFilename,
			);
			allResults.push(...results);
		}

		const report = buildRnParityReport(
			allResults,
			scale,
			Platform.OS,
			modes.map((m) => (m === "expo" ? "expo" : m)),
		);

		return { results: allResults, report };
	} finally {
		if (exclusiveNative) {
			onProgress?.("Restoring app database…");
			await resumeDatabaseAfterNativeBench();
		}
	}
}
