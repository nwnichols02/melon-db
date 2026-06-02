import type { BenchResult, RnCompareRow, RnParityReport } from "./types.ts";

const RN_PARITY_SCENARIOS = [
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
 * Builds jsi-sync vs turbo parity rows for one scale.
 */
export function buildRnParityReport(
	results: BenchResult[],
	scale: number,
	platform: string,
	modes: string[],
): RnParityReport {
	const comparisons: RnCompareRow[] = [];

	for (const scenario of RN_PARITY_SCENARIOS) {
		const jsiSyncMs = findMs(results, "melon-jsi-sync", scale, scenario);
		const turboMs = findMs(results, "melon-turbo", scale, scenario);
		if (jsiSyncMs === undefined || turboMs === undefined) {
			continue;
		}

		const ratio =
			turboMs > 0
				? jsiSyncMs / turboMs
				: jsiSyncMs > 0
					? Number.POSITIVE_INFINITY
					: 1;
		const winner =
			Math.abs(jsiSyncMs - turboMs) < 0.01
				? "tie"
				: jsiSyncMs < turboMs
					? "jsi-sync"
					: "turbo";

		comparisons.push({
			scenario,
			scale,
			jsiSyncMs,
			turboMs,
			ratio: Number(ratio.toFixed(4)),
			winner,
		});
	}

	return {
		timestamp: new Date().toISOString(),
		scale,
		platform,
		modes,
		comparisons,
		raw: results,
		notes: [
			"On-device Melon native SQLite: jsi-sync vs turbo",
			"ratio = jsiSyncMs / turboMs (< 1 means jsi-sync faster)",
		],
	};
}
