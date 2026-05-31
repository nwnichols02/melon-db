import { MelonError, MelonErrorCode } from "../errors.ts";
import type { MelonSchema } from "../schema.ts";
import type {
	Migration,
	MigrationAdapterHooks,
	MigrationStepExecutor,
} from "./types.ts";
import { SCHEMA_VERSION_KEY } from "./types.ts";

/**
 * Reads the stored schema version from adapter meta storage.
 */
export async function getStoredSchemaVersion(
	hooks: MigrationAdapterHooks,
): Promise<number> {
	const raw = await hooks.getMeta(SCHEMA_VERSION_KEY);
	if (raw === null) {
		return 0;
	}
	const parsed = Number.parseInt(raw, 10);
	return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Runs migrations using adapter-specific step executors.
 */
export async function runMigrationsWithExecutor(
	schema: MelonSchema,
	migrations: Migration[],
	hooks: MigrationAdapterHooks,
	executor: MigrationStepExecutor,
): Promise<void> {
	if (migrations.length === 0) {
		return;
	}

	const sorted = [...migrations].sort((a, b) => a.toVersion - b.toVersion);
	for (let index = 0; index < sorted.length; index++) {
		const expected = index + 1;
		const migration = sorted[index];
		if (!migration || migration.toVersion !== expected) {
			throw new MelonError(
				`Migration sequence gap: expected toVersion ${expected}, got ${migration?.toVersion ?? "none"}`,
				{
					code: MelonErrorCode.MIGRATION_FAILED,
					remediation:
						"Provide contiguous migrations with toVersion 1, 2, 3, ...",
				},
			);
		}
	}

	const stored = await getStoredSchemaVersion(hooks);
	if (stored > schema.version) {
		throw new MelonError(
			`Database schema version ${stored} is newer than app schema version ${schema.version}`,
			{
				code: MelonErrorCode.MIGRATION_FAILED,
				remediation:
					"Upgrade the app or reset the local database in development.",
			},
		);
	}

	if (stored >= schema.version) {
		return;
	}

	for (const migration of sorted) {
		if (migration.toVersion <= stored || migration.toVersion > schema.version) {
			continue;
		}

		await hooks.execSql("BEGIN");
		try {
			for (const step of migration.steps) {
				if (step.type === "sql") {
					await hooks.execSql(step.sql);
					continue;
				}
				await executor.applyStep(step, schema);
			}
			await hooks.setMeta(SCHEMA_VERSION_KEY, String(migration.toVersion));
			await hooks.execSql("COMMIT");
		} catch (error) {
			await hooks.execSql("ROLLBACK");
			throw new MelonError(
				`Migration to version ${migration.toVersion} failed`,
				{
					code: MelonErrorCode.MIGRATION_FAILED,
					cause: error,
				},
			);
		}
	}
}
