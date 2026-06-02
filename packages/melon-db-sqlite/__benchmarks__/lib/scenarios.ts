import { createInMemoryAdapter } from "@melon/db";
import { createSqliteAdapter } from "../../src/adapter.ts";
import { runScenariosForAdapter } from "../../src/bench/scenarios.ts";
import type { BenchEngine, BenchResult } from "./bench-runner.ts";

function engineLabel(
	adapterKind: "sqlite" | "memory",
): BenchEngine | "in-memory" {
	if (adapterKind === "memory") {
		return "in-memory";
	}
	return "melon-bun";
}

/**
 * Runs all benchmark scenarios for one adapter kind and scale.
 */
export async function runScenarios(
	adapterKind: "sqlite" | "memory",
	scale: number,
): Promise<BenchResult[]> {
	const createAdapter = () =>
		adapterKind === "memory"
			? createInMemoryAdapter()
			: createSqliteAdapter({ filename: ":memory:" });

	return runScenariosForAdapter(createAdapter, scale, engineLabel(adapterKind));
}
