import { createNodeSqliteAdapter } from "../../src/node.ts";
import { runScenariosForAdapter } from "../../src/bench/scenarios.ts";
import type { BenchResult } from "./bench-runner.ts";

/**
 * Runs Melon scenarios via createNodeSqliteAdapter (better-sqlite3).
 */
export async function runMelonNodeScenarios(
	scale: number,
): Promise<BenchResult[]> {
	return runScenariosForAdapter(
		() => createNodeSqliteAdapter({ filename: ":memory:" }),
		scale,
		"melon-node",
	);
}
