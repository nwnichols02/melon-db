/**
 * Benchmark: insert and query scenarios at 10k / 50k / 100k scale.
 * Run: bun run packages/melon-db-sqlite/__benchmarks__/insert-query.bench.ts
 * Flags: --scale=10k|50k|100k|all --adapter=sqlite|memory|both --json
 */
import {
	parseBenchCli,
	printJsonSummary,
	printResults,
} from "./lib/bench-runner.ts";
import { runScenarios } from "./lib/scenarios.ts";

const cli = parseBenchCli(process.argv.slice(2));
const adapters: Array<"sqlite" | "memory"> =
	cli.adapter === "both"
		? ["sqlite", "memory"]
		: cli.adapter === "sqlite"
			? ["sqlite"]
			: ["memory"];

const allResults = [];

for (const scale of cli.scales) {
	console.log(`\n=== Scale: ${scale.toLocaleString()} rows ===\n`);
	for (const adapter of adapters) {
		const results = await runScenarios(adapter, scale);
		allResults.push(...results);
		if (!cli.json) {
			printResults(results);
		}
	}
}

if (cli.json) {
	printJsonSummary(allResults);
} else {
	console.log("\nDone.");
}
