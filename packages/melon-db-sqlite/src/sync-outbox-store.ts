import type { SyncOutboxEntry, SyncOutboxStore } from "@melon/db";
import type { SqliteDriver } from "./driver.ts";
import { toSqlParams } from "./sql/bindings.ts";
import { SYNC_OUTBOX_TABLE } from "./sync-outbox-ddl.ts";

function recordKey(collection: string, recordId: string | number): string {
	return `${collection}:${String(recordId)}`;
}

/**
 * Creates a SQLite-backed sync outbox store.
 */
export function createSqliteSyncOutboxStore(
	driver: SqliteDriver,
): SyncOutboxStore {
	return {
		async list(): Promise<SyncOutboxEntry[]> {
			const rows = await driver.queryAll(
				`SELECT "id", "collection", "record_id", "operation", "timestamp" FROM "${SYNC_OUTBOX_TABLE}"`,
				[],
			);
			return rows.map((row) => ({
				id: String(row.id),
				collection: String(row.collection),
				recordId: String(row.record_id),
				operation: String(row.operation) as SyncOutboxEntry["operation"],
				timestamp: Number(row.timestamp),
			}));
		},

		async upsert(entry: SyncOutboxEntry): Promise<void> {
			await driver.run(
				`DELETE FROM "${SYNC_OUTBOX_TABLE}" WHERE "collection" = ? AND "record_id" = ?`,
				toSqlParams([entry.collection, String(entry.recordId)]),
			);
			await driver.run(
				`INSERT INTO "${SYNC_OUTBOX_TABLE}" ("id", "collection", "record_id", "operation", "timestamp") VALUES (?, ?, ?, ?, ?)`,
				toSqlParams([
					entry.id,
					entry.collection,
					String(entry.recordId),
					entry.operation,
					entry.timestamp,
				]),
			);
		},

		async removeByRecord(
			collection: string,
			recordId: string | number,
		): Promise<void> {
			await driver.run(
				`DELETE FROM "${SYNC_OUTBOX_TABLE}" WHERE "collection" = ? AND "record_id" = ?`,
				toSqlParams([collection, String(recordId)]),
			);
		},

		async clear(collections?: string[]): Promise<void> {
			if (!collections) {
				await driver.run(`DELETE FROM "${SYNC_OUTBOX_TABLE}"`, []);
				return;
			}
			for (const collection of collections) {
				await driver.run(
					`DELETE FROM "${SYNC_OUTBOX_TABLE}" WHERE "collection" = ?`,
					toSqlParams([collection]),
				);
			}
		},
	};
}

export { recordKey };
