/**
 * Returns true when better-sqlite3 native bindings load (Node or Bun with prebuild).
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
 * Runtime binary for compare subprocess when the parent cannot load better-sqlite3.
 * Defaults to Bun (handles WDB CJS imports); override with COMPARE_RUNNER_BIN.
 */
export function resolveCompareRunnerBinary(): string {
	return process.env.COMPARE_RUNNER_BIN ?? process.env.BUN_BIN ?? "bun";
}
