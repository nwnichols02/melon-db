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

const BENCH_DB_PREFIX = "melon-bench";

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
): StorageAdapter {
	if (!isJsiSqliteAvailable()) {
		throw new Error(
			"Melon JSI SQLite requires a native binary. Run install:ios or install:android from playground-rn-dev.",
		);
	}
	return createJsiSqliteAdapter({
		filename: `${BENCH_DB_PREFIX}-${mode}.db`,
		basePath,
		mode,
	});
}

let expoBenchCounter = 0;

async function createExpoBenchAdapter(): Promise<StorageAdapter> {
	const SQLite = await import("expo-sqlite");
	const { createExpoSqliteAdapter } = await import("@melon/db-sqlite/expo");
	expoBenchCounter += 1;
	const database = await SQLite.openDatabaseAsync(
		`${BENCH_DB_PREFIX}-expo-${expoBenchCounter}.db`,
	);
	return createExpoSqliteAdapter({ database });
}

async function runModeScenarios(
	mode: DeviceBenchMode,
	scale: DeviceBenchScale,
	basePath: string,
): Promise<BenchResult[]> {
	if (mode === "expo") {
		return runScenariosForAdapter(
			() => createExpoBenchAdapter(),
			scale,
			engineLabelForMode(mode),
		);
	}

	return runScenariosForAdapter(
		() => createNativeAdapter(mode, basePath),
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

	for (const mode of modes) {
		onProgress?.(`Running ${mode} @ ${scale.toLocaleString()}…`);
		const results = await runModeScenarios(mode, scale, basePath);
		allResults.push(...results);
	}

	const report = buildRnParityReport(
		allResults,
		scale,
		Platform.OS,
		modes.map((m) => (m === "expo" ? "expo" : m)),
	);

	return { results: allResults, report };
}
