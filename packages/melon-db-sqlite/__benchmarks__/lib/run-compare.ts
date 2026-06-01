import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { BenchResult, CompareCliOptions } from "./bench-runner.ts";
import { buildParityReport } from "./compare-report.ts";
import type { ParityReport } from "./bench-runner.ts";
import {
	isBetterSqlite3Available,
	resolveCompareRunnerBinary,
} from "./better-sqlite3-available.ts";
import { runMelonNodeScenarios } from "./melon-node-scenarios.ts";
import { runScenarios } from "./scenarios.ts";
import { runWdbScenarios } from "./wdb-scenarios.ts";

const compareSqliteRunnerPath = fileURLToPath(
	new URL("./compare-sqlite-runner.ts", import.meta.url),
);

export interface CompareBenchmarkOutput {
	results: BenchResult[];
	reports: ParityReport[];
}

function runSqliteLegsViaSubprocess(
	scaleArg: string,
	skipWdb: boolean,
): BenchResult[] {
	const args = [compareSqliteRunnerPath, `--scale=${scaleArg}`, "--json"];
	if (skipWdb) {
		args.push("--skip-wdb");
	}

	const runnerBin = resolveCompareRunnerBinary();
	const runnerArgs =
		runnerBin === "node"
			? ["--experimental-strip-types", ...args]
			: args;
	const proc = spawnSync(runnerBin, runnerArgs, {
		encoding: "utf8",
		cwd: fileURLToPath(new URL("..", import.meta.url)),
	});

	if (proc.status !== 0) {
		throw new Error(
			`Compare subprocess failed (exit ${proc.status}): ${proc.stderr || proc.stdout}`,
		);
	}

	const line = proc.stdout.trim().split("\n").at(-1);
	if (!line) {
		throw new Error("Compare subprocess produced no JSON output");
	}

	const parsed = JSON.parse(line) as { results: BenchResult[] };
	return parsed.results;
}

async function runBetterSqliteLegs(
	scales: number[],
	skipWdb: boolean,
	melonEngines: CompareCliOptions["melonEngines"],
	scaleArg: string,
): Promise<BenchResult[]> {
	const includeMelonNode = melonEngines.includes("node");
	if (!includeMelonNode && skipWdb) {
		return [];
	}

	if (await isBetterSqlite3Available()) {
		const results: BenchResult[] = [];
		for (const scale of scales) {
			if (includeMelonNode) {
				results.push(...(await runMelonNodeScenarios(scale)));
			}
			if (!skipWdb) {
				results.push(...(await runWdbScenarios(scale)));
			}
		}
		return results;
	}

	return runSqliteLegsViaSubprocess(scaleArg, skipWdb);
}

/**
 * Runs the full Melon vs WatermelonDB compare harness and builds parity reports.
 */
export async function runCompareBenchmark(
	cli: CompareCliOptions,
): Promise<CompareBenchmarkOutput> {
	const allResults: BenchResult[] = [];

	for (const scale of cli.scales) {
		if (cli.melonEngines.includes("bun")) {
			allResults.push(...(await runScenarios("sqlite", scale)));
		}
	}

	allResults.push(
		...(await runBetterSqliteLegs(
			cli.scales,
			cli.skipWdb,
			cli.melonEngines,
			cli.scaleArg,
		)),
	);

	const reports = cli.scales.map((scale) => buildParityReport(allResults, scale));

	return { results: allResults, reports };
}
