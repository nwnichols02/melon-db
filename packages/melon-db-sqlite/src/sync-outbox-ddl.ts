export const SYNC_OUTBOX_TABLE = "_melon_sync_outbox";
export const SYNC_OUTBOX_PENDING_FIELDS_COLUMN = "pending_fields";

/**
 * DDL for the engine-managed sync outbox table.
 */
export function generateSyncOutboxDdl(): string[] {
	return [
		`CREATE TABLE IF NOT EXISTS "${SYNC_OUTBOX_TABLE}" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "collection" TEXT NOT NULL,
  "record_id" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "timestamp" REAL NOT NULL,
  "pending_fields" TEXT
)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS "_melon_sync_outbox_record_idx" ON "${SYNC_OUTBOX_TABLE}" ("collection", "record_id")`,
	];
}

/**
 * Adds pending_fields column to existing outbox tables (idempotent).
 */
export async function migrateSyncOutboxPendingFieldsColumn(
	queryAll: (
		sql: string,
		params: readonly unknown[],
	) => Promise<Record<string, unknown>[]>,
	exec: (sql: string) => Promise<void>,
): Promise<void> {
	const columns = await queryAll(
		`PRAGMA table_info("${SYNC_OUTBOX_TABLE}")`,
		[],
	);
	const hasColumn = columns.some(
		(row) => String(row.name) === SYNC_OUTBOX_PENDING_FIELDS_COLUMN,
	);
	if (!hasColumn) {
		await exec(
			`ALTER TABLE "${SYNC_OUTBOX_TABLE}" ADD COLUMN "pending_fields" TEXT`,
		);
	}
}
