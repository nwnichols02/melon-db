export const SYNC_OUTBOX_TABLE = "_melon_sync_outbox";

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
  "timestamp" REAL NOT NULL
)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS "_melon_sync_outbox_record_idx" ON "${SYNC_OUTBOX_TABLE}" ("collection", "record_id")`,
	];
}
