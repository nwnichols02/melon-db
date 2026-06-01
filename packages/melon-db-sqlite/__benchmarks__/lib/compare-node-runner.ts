import { parseCompareCli, printJsonSummary } from "./bench-runner.ts";
/**
 * Node/better-sqlite3 compare leg (melon-node + watermelon).
 * Run via Node when Bun cannot load better-sqlite3 bindings.
 *
 *   node --experimental-strip-types lib/compare-node-runner.ts --scale=10k --json
 */
import { isBetterSqlite3Available } from "./better-sqlite3-available.ts";
import { runMelonNodeScenarios } from "./melon-node-scenarios.ts";
import { runWdbScenarios } from "./wdb-scenarios.ts";

export async function runNodeCompareLegs(
	scales: number[],
	skipWdb: boolean,
): Promise<import("./bench-runner.ts").BenchResult[]> {
	const allResults: import("./bench-runner.ts").BenchResult[] = [];

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
		: process.argv[1]?.includes("compare-node-runner");

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
	const results = await runNodeCompareLegs(cli.scales, cli.skipWdb);
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
