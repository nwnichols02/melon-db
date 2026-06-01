/**
 * Returns true when better-sqlite3 native bindings load in the current process.
 * Under Bun this is always false today (native Node addons; see oven-sh/bun#4290).
 */
export async function isBetterSqlite3Available(): Promise<boolean> {
	try {
		const BetterSqlite3 = (await import("better-sqlite3")).default as new (
			filename: string,
		) => { close(): void };
		const db = new BetterSqlite3(":memory:");
		db.close();
		return true;
	} catch {
		return false;
	}
}

/**
 * Process binary for the compare subprocess (melon-node + watermelon legs).
 * Defaults to Node because better-sqlite3 does not run in Bun yet.
 * Override with COMPARE_RUNNER_BIN (e.g. `node` on CI).
 */
export function resolveCompareRunnerBinary(): string {
	return process.env.COMPARE_RUNNER_BIN ?? "node";
}
