import { join } from "node:path";
import type { SQL } from "bun";

export interface RunMigrationsOptions {
	sql: SQL;
	migrationsDir?: string;
}

/**
 * Runs idempotent SQL migration files in lexical order from the package sql/ directory.
 */
export async function runSyncServerMigrations(
	options: RunMigrationsOptions,
): Promise<void> {
	const migrationsDir =
		options.migrationsDir ?? join(import.meta.dir, "..", "sql");
	const glob = new Bun.Glob("*.sql");
	const files = [...glob.scanSync({ cwd: migrationsDir })].sort();

	for (const file of files) {
		await options.sql.file(join(migrationsDir, file));
	}
}
