import type { BenchResult, CompareRow, ParityReport } from "./bench-runner.ts";

const PARITY_SCENARIOS = [
	"row-insert",
	"batch-insert",
	"filtered-query",
	"count-query",
	"find-by-id",
] as const;

function findMs(
	results: BenchResult[],
	engine: string,
	scale: number,
	scenario: string,
): number | undefined {
	return results.find(
		(result) =>
			result.engine === engine &&
			result.scale === scale &&
			result.scenario === scenario,
	)?.durationMs;
}

/**
 * Builds melon-node vs watermelon parity rows for one scale.
 */
export function buildParityReport(
	results: BenchResult[],
	scale: number,
): ParityReport {
	const comparisons: CompareRow[] = [];

	for (const scenario of PARITY_SCENARIOS) {
		const melonNodeMs = findMs(results, "melon-node", scale, scenario);
		const watermelonMs = findMs(results, "watermelon", scale, scenario);
		if (melonNodeMs === undefined || watermelonMs === undefined) {
			continue;
		}

		const ratio =
			watermelonMs > 0
				? melonNodeMs / watermelonMs
				: melonNodeMs > 0
					? Number.POSITIVE_INFINITY
					: 1;
		const winner =
			Math.abs(melonNodeMs - watermelonMs) < 0.01
				? "tie"
				: melonNodeMs < watermelonMs
					? "melon"
					: "watermelon";

		comparisons.push({
			scenario,
			scale,
			melonNodeMs,
			watermelonMs,
			ratio: Number(ratio.toFixed(4)),
			winner,
		});
	}

	return {
		timestamp: new Date().toISOString(),
		scale,
		comparisons,
		raw: results,
		notes: [
			"Primary axis: melon-node vs watermelon on better-sqlite3 :memory:",
			"ratio = melonNodeMs / watermelonMs (< 1 means Melon faster)",
		],
	};
}

/**
 * Prints a human-readable parity table.
 */
export function printParityReport(report: ParityReport): void {
	console.log(`\n=== Parity @ ${report.scale.toLocaleString()} rows ===\n`);
	console.log(
		"scenario".padEnd(18) +
			"melon-node".padStart(12) +
			"watermelon".padStart(12) +
			"ratio".padStart(10) +
			"winner".padStart(12),
	);
	console.log("-".repeat(64));

	for (const row of report.comparisons) {
		console.log(
			row.scenario.padEnd(18) +
				`${row.melonNodeMs.toFixed(2)}ms`.padStart(12) +
				`${row.watermelonMs.toFixed(2)}ms`.padStart(12) +
				row.ratio.toFixed(4).padStart(10) +
				row.winner.padStart(12),
		);
	}

	if (report.comparisons.length === 0) {
		console.log("(no paired scenarios — is better-sqlite3 available?)");
	}
}

/**
 * Prints parity JSON for CI.
 */
export function printParityJson(report: ParityReport): void {
	const { raw: _raw, ...payload } = report;
	console.log(JSON.stringify(payload));
}
