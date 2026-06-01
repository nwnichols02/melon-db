/**
 * Benchmark: Melon vs WatermelonDB on shared scenarios.
 *
 * Run: bun run packages/melon-db-sqlite/__benchmarks__/compare-watermelon.bench.ts
 * Flags: --scale=10k|50k|100k|all --json --skip-wdb --melon-engines=bun,node
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
	type BenchResult,
	parseCompareCli,
	printResults,
} from "./lib/bench-runner.ts";
import {
	isBetterSqlite3Available,
	resolveCompareRunnerBinary,
} from "./lib/better-sqlite3-available.ts";
import {
	buildParityReport,
	printParityJson,
	printParityReport,
} from "./lib/compare-report.ts";
import { runMelonNodeScenarios } from "./lib/melon-node-scenarios.ts";
import { runScenarios } from "./lib/scenarios.ts";
import { runWdbScenarios } from "./lib/wdb-scenarios.ts";

const compareNodeRunnerPath = fileURLToPath(
	new URL("./lib/compare-node-runner.ts", import.meta.url),
);

async function runNodeLegsViaSubprocess(
	scaleArg: string,
	skipWdb: boolean,
): Promise<BenchResult[]> {
	const runnerBin = resolveCompareRunnerBinary();
	const args = [compareNodeRunnerPath, `--scale=${scaleArg}`, "--json"];
	if (skipWdb) {
		args.push("--skip-wdb");
	}

	const proc = spawnSync(runnerBin, args, {
		encoding: "utf8",
		cwd: fileURLToPath(new URL(".", import.meta.url)),
	});

	if (proc.status !== 0) {
		console.error(proc.stderr || proc.stdout);
		throw new Error(`Compare subprocess failed (exit ${proc.status})`);
	}

	const line = proc.stdout.trim().split("\n").at(-1);
	if (!line) {
		throw new Error("Compare subprocess produced no JSON output");
	}

	const parsed = JSON.parse(line) as { results: BenchResult[] };
	return parsed.results;
}

async function runNodeLegs(
	scales: number[],
	skipWdb: boolean,
	melonEngines: Array<"bun" | "node">,
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

	console.warn(
		"better-sqlite3 not available in this runtime; spawning compare subprocess for melon-node / watermelon legs.",
	);
	return runNodeLegsViaSubprocess(scaleArg, skipWdb);
}

const cli = parseCompareCli(process.argv.slice(2));
const allResults: BenchResult[] = [];

for (const scale of cli.scales) {
	console.log(`\n=== Scale: ${scale.toLocaleString()} rows ===\n`);

	if (cli.melonEngines.includes("bun")) {
		const bunResults = await runScenarios("sqlite", scale);
		allResults.push(...bunResults);
		if (!cli.json) {
			printResults(bunResults);
		}
	}
}

const nodeResults = await runNodeLegs(
	cli.scales,
	cli.skipWdb,
	cli.melonEngines,
	cli.scaleArg,
);
allResults.push(...nodeResults);
if (!cli.json && nodeResults.length > 0) {
	printResults(nodeResults);
}

if (cli.json) {
	for (const scale of cli.scales) {
		const report = buildParityReport(allResults, scale);
		printParityJson(report);
	}
} else {
	for (const scale of cli.scales) {
		const report = buildParityReport(allResults, scale);
		printParityReport(report);
	}
	console.log("\nDone.");
}
