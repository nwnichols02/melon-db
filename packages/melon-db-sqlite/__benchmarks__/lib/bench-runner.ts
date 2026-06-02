export type {
	BenchEngine,
	BenchResult,
	BenchSummary,
	CompareRow,
	ParityReport,
} from "../../src/bench/types.ts";
import type { BenchResult, BenchSummary } from "../../src/bench/types.ts";
import { measureMs } from "../../src/bench/measure.ts";

export { measureMs };

export interface BenchCliOptions {
	scales: number[];
	adapter: "sqlite" | "memory" | "both";
	json: boolean;
}

export interface CompareCliOptions {
	scales: number[];
	scaleArg: string;
	json: boolean;
	skipWdb: boolean;
	melonEngines: Array<"bun" | "node">;
}

const SCALE_MAP: Record<string, number> = {
	"10k": 10_000,
	"50k": 50_000,
	"100k": 100_000,
};

/**
 * Prints human-readable benchmark output.
 */
export function printResults(results: BenchResult[]): void {
	for (const result of results) {
		const extra =
			result.resultCount !== undefined
				? ` (${result.resultCount} rows)`
				: result.rowCount !== undefined
					? ` (${result.rowCount} rows)`
					: "";
		console.log(
			`[${result.engine}] ${result.scenario} @ ${result.scale}: ${result.durationMs.toFixed(2)}ms${extra}`,
		);
	}
}

/**
 * Prints a machine-readable JSON summary for CI parsing.
 */
export function printJsonSummary(results: BenchResult[]): void {
	const summary: BenchSummary = {
		results,
		timestamp: new Date().toISOString(),
	};
	console.log(JSON.stringify(summary));
}

/**
 * Parses benchmark CLI flags from process.argv.
 */
export function parseBenchCli(argv: string[]): BenchCliOptions {
	let scaleArg = "10k";
	let adapter: BenchCliOptions["adapter"] = "both";
	let json = false;

	for (const arg of argv) {
		if (arg.startsWith("--scale=")) {
			scaleArg = arg.slice("--scale=".length);
		} else if (arg.startsWith("--adapter=")) {
			const value = arg.slice("--adapter=".length);
			if (value === "sqlite" || value === "memory" || value === "both") {
				adapter = value;
			}
		} else if (arg === "--json") {
			json = true;
		}
	}

	const scales =
		scaleArg === "all"
			? [10_000, 50_000, 100_000]
			: [SCALE_MAP[scaleArg] ?? 10_000];

	return { scales, adapter, json };
}

/**
 * Parses compare-watermelon CLI flags from process.argv.
 */
export function parseCompareCli(argv: string[]): CompareCliOptions {
	let scaleArg = "10k";
	let json = false;
	let skipWdb = false;
	let melonEngines: CompareCliOptions["melonEngines"] = ["node"];

	for (const arg of argv) {
		if (arg.startsWith("--scale=")) {
			scaleArg = arg.slice("--scale=".length);
		} else if (arg === "--json") {
			json = true;
		} else if (arg === "--skip-wdb") {
			skipWdb = true;
		} else if (arg.startsWith("--melon-engines=")) {
			const value = arg.slice("--melon-engines=".length);
			melonEngines = value
				.split(",")
				.map((part) => part.trim())
				.filter(
					(part): part is "bun" | "node" => part === "bun" || part === "node",
				);
			if (melonEngines.length === 0) {
				melonEngines = ["node"];
			}
		}
	}

	const scales =
		scaleArg === "all"
			? [10_000, 50_000, 100_000]
			: [SCALE_MAP[scaleArg] ?? 10_000];

	return { scales, scaleArg, json, skipWdb, melonEngines };
}
