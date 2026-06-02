import type { BenchResult, RnMelonVsWdbReport, RnMelonVsWdbRow } from "./types.ts";

const MELON_WDB_PARITY_SCENARIOS = [
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
 * Builds on-device Melon vs WatermelonDB parity rows for one scale.
 */
export function buildRnMelonVsWdbReport(
	results: BenchResult[],
	scale: number,
	platform: string,
	melonEngine = "melon-jsi-sync",
): RnMelonVsWdbReport {
	const comparisons: RnMelonVsWdbRow[] = [];

	for (const scenario of MELON_WDB_PARITY_SCENARIOS) {
		const melonMs = findMs(results, melonEngine, scale, scenario);
		const watermelonMs = findMs(results, "watermelon", scale, scenario);
		if (melonMs === undefined || watermelonMs === undefined) {
			continue;
		}

		const ratio =
			watermelonMs > 0
				? melonMs / watermelonMs
				: melonMs > 0
					? Number.POSITIVE_INFINITY
					: 1;
		const winner =
			Math.abs(melonMs - watermelonMs) < 0.01
				? "tie"
				: melonMs < watermelonMs
					? "melon"
					: "watermelon";

		comparisons.push({
			scenario,
			scale,
			melonMs,
			watermelonMs,
			ratio: Number(ratio.toFixed(4)),
			winner,
		});
	}

	return {
		timestamp: new Date().toISOString(),
		scale,
		platform,
		melonEngine,
		comparisons,
		raw: results,
		notes: [
			`On-device Melon (${melonEngine}) vs WatermelonDB`,
			"ratio = melonMs / watermelonMs (< 1 means Melon faster)",
		],
	};
}
