/**
 * Runs bench:compare and writes JSON for the docs "Latest results" page.
 *
 *   bun run packages/melon-db-sqlite/__benchmarks__/write-docs-artifact.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCompareCli } from "./lib/bench-runner.ts";
import { runCompareBenchmark } from "./lib/run-compare.ts";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const defaultOut = join(
	repoRoot,
	"apps/docs/src/data/bench-compare-latest.json",
);

const cli = parseCompareCli([
	"--scale=10k",
	"--melon-engines=bun,node",
	...process.argv.slice(2),
]);

const { results, reports } = await runCompareBenchmark(cli);

const melonBun = results.filter((row) => row.engine === "melon-bun");

const artifact = {
	generatedAt: new Date().toISOString(),
	updatedBy: "bench:compare:docs",
	scales: cli.scales,
	reports: reports.map(({ raw: _raw, ...report }) => report),
	melonBun: melonBun.length > 0 ? melonBun : undefined,
};

const outPath = process.env.BENCH_COMPARE_DOCS_OUT ?? defaultOut;
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

console.log(`Wrote ${outPath}`);
if (reports.every((report) => report.comparisons.length === 0)) {
	console.warn(
		"No parity rows — is better-sqlite3 available (Node subprocess)?",
	);
	process.exit(1);
}
