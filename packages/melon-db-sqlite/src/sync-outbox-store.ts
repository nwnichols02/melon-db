import type { SyncOutboxEntry, SyncOutboxStore } from "@melon-db/db";
import type { SqliteDriver } from "./driver.ts";
import { toSqlParams } from "./sql/bindings.ts";
import { SYNC_OUTBOX_TABLE } from "./sync-outbox-ddl.ts";

function recordKey(collection: string, recordId: string | number): string {
	return `${collection}:${String(recordId)}`;
}

function parsePendingFields(raw: unknown): Record<string, unknown> | undefined {
	if (raw === null || raw === undefined) {
		return undefined;
	}
	const text = String(raw);
	if (text.length === 0) {
		return undefined;
	}
	try {
		const parsed = JSON.parse(text) as unknown;
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
	} catch {
		return undefined;
	}
	return undefined;
}

function serializePendingFields(
	pendingFields: Record<string, unknown> | undefined,
): string | null {
	if (!pendingFields || Object.keys(pendingFields).length === 0) {
		return null;
	}
	return JSON.stringify(pendingFields);
}

function mapOutboxRow(row: Record<string, unknown>): SyncOutboxEntry {
	return {
		id: String(row.id),
		collection: String(row.collection),
		recordId: String(row.record_id),
		operation: String(row.operation) as SyncOutboxEntry["operation"],
		timestamp: Number(row.timestamp),
		pendingFields: parsePendingFields(row.pending_fields),
	};
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
				`SELECT "id", "collection", "record_id", "operation", "timestamp", "pending_fields" FROM "${SYNC_OUTBOX_TABLE}"`,
				[],
			);
			return rows.map((row) => mapOutboxRow(row));
		},

		async findByRecord(
			collection: string,
			recordId: string | number,
		): Promise<SyncOutboxEntry | null> {
			const row = await driver.queryFirst(
				`SELECT "id", "collection", "record_id", "operation", "timestamp", "pending_fields" FROM "${SYNC_OUTBOX_TABLE}" WHERE "collection" = ? AND "record_id" = ? LIMIT 1`,
				toSqlParams([collection, String(recordId)]),
			);
			if (!row) {
				return null;
			}
			return mapOutboxRow(row);
		},

		async upsert(entry: SyncOutboxEntry): Promise<void> {
			await driver.run(
				`DELETE FROM "${SYNC_OUTBOX_TABLE}" WHERE "collection" = ? AND "record_id" = ?`,
				toSqlParams([entry.collection, String(entry.recordId)]),
			);
			await driver.run(
				`DELETE FROM "${SYNC_OUTBOX_TABLE}" WHERE "id" = ?`,
				toSqlParams([entry.id]),
			);
			await driver.run(
				`INSERT INTO "${SYNC_OUTBOX_TABLE}" ("id", "collection", "record_id", "operation", "timestamp", "pending_fields") VALUES (?, ?, ?, ?, ?, ?)`,
				toSqlParams([
					entry.id,
					entry.collection,
					String(entry.recordId),
					entry.operation,
					entry.timestamp,
					serializePendingFields(entry.pendingFields),
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
