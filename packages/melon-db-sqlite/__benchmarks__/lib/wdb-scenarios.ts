import { runWdbScenarios as runWdbScenariosCore } from "../../src/bench/wdb-scenarios.ts";
import type { BenchResult } from "./bench-runner.ts";
import { closeWdbDatabase, createWdbDatabase } from "./wdb-setup.ts";

/**
 * Runs WatermelonDB benchmark scenarios matching the Melon harness (Node).
 */
export async function runWdbScenarios(scale: number): Promise<BenchResult[]> {
	return runWdbScenariosCore(scale, {
		createDatabase: createWdbDatabase,
		closeDatabase: closeWdbDatabase,
	});
}
