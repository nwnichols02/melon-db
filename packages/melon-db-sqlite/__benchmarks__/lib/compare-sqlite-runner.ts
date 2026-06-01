import { parseCompareCli, printJsonSummary } from "./bench-runner.ts";
import type { BenchResult } from "./bench-runner.ts";
/**
 * better-sqlite3 compare leg (melon-node + watermelon).
 * Run under Node when the parent is Bun (better-sqlite3 is a Node native addon).
 *
 *   node --experimental-strip-types lib/compare-sqlite-runner.ts --scale=10k --json
 */
import { isBetterSqlite3Available } from "./better-sqlite3-available.ts";
import { runMelonNodeScenarios } from "./melon-node-scenarios.ts";
import { runWdbScenarios } from "./wdb-scenarios.ts";

export async function runSqliteCompareLegs(
	scales: number[],
	skipWdb: boolean,
): Promise<BenchResult[]> {
	const allResults: BenchResult[] = [];

	for (const scale of scales) {
		allResults.push(...(await runMelonNodeScenarios(scale)));
		if (!skipWdb) {
			allResults.push(...(await runWdbScenarios(scale)));
		}
	}

	return allResults;
}

const isMain =
	typeof import.meta.main === "boolean"
		? import.meta.main
		: process.argv[1]?.includes("compare-sqlite-runner");

if (isMain) {
	const cli = parseCompareCli(process.argv.slice(2));
	if (!(await isBetterSqlite3Available())) {
		console.warn(
			"better-sqlite3 bindings unavailable; skipping melon-node and watermelon benchmark legs.",
		);
		if (cli.json) {
			printJsonSummary([]);
		}
		process.exit(0);
	}
	const results = await runSqliteCompareLegs(cli.scales, cli.skipWdb);
	if (cli.json) {
		printJsonSummary(results);
	} else {
		for (const result of results) {
			console.log(
				`[${result.engine}] ${result.scenario} @ ${result.scale}: ${result.durationMs.toFixed(2)}ms`,
			);
		}
	}
}
