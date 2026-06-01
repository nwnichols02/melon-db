/**
 * Benchmark: Melon vs WatermelonDB on shared scenarios.
 *
 * Run: bun run packages/melon-db-sqlite/__benchmarks__/compare-watermelon.bench.ts
 * Flags: --scale=10k|50k|100k|all --json --skip-wdb --melon-engines=bun,node
 */
import { parseCompareCli, printResults } from "./lib/bench-runner.ts";
import { printParityJson, printParityReport } from "./lib/compare-report.ts";
import { runCompareBenchmark } from "./lib/run-compare.ts";

const cli = parseCompareCli(process.argv.slice(2));
const { results: allResults, reports } = await runCompareBenchmark(cli);

for (const scale of cli.scales) {
	console.log(`\n=== Scale: ${scale.toLocaleString()} rows ===\n`);

	if (!cli.json && cli.melonEngines.includes("bun")) {
		const bunResults = allResults.filter(
			(row) => row.engine === "melon-bun" && row.scale === scale,
		);
		if (bunResults.length > 0) {
			printResults(bunResults);
		}
	}
}

if (!cli.json) {
	const sqliteResults = allResults.filter(
		(row) => row.engine === "melon-node" || row.engine === "watermelon",
	);
	if (sqliteResults.length > 0) {
		printResults(sqliteResults);
	}
}

if (cli.json) {
	for (const report of reports) {
		printParityJson(report);
	}
} else {
	for (const report of reports) {
		printParityReport(report);
	}
	console.log("\nDone.");
}
