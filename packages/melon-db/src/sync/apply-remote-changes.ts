import type { WriteContext } from "../database/types.ts";
import { MelonError, MelonErrorCode } from "../errors.ts";
import type { MelonSchema } from "../schema.ts";
import { validateSyncChanges } from "./get-local-changes.ts";
import { clearOutboxForRemoteRecord } from "./ledger.ts";
import type {
	ApplyRemoteChangesOptions,
	SyncChanges,
	SyncOutboxStore,
	SyncRecord,
} from "./types.ts";

const DEFAULT_TIMESTAMP_FIELD = "_updated_at";

function readTimestamp(record: SyncRecord, field: string): number | null {
	const value = record[field];
	if (value instanceof Date) {
		return value.getTime();
	}
	if (typeof value === "number" && Number.isFinite(value)) {
		return value;
	}
	if (typeof value === "string") {
		const parsed = Date.parse(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function resolveTimestampField(
	local: SyncRecord | null,
	remote: SyncRecord,
	configured?: string,
): string | null {
	if (configured) {
		return configured;
	}
	if (
		DEFAULT_TIMESTAMP_FIELD in remote ||
		(local && DEFAULT_TIMESTAMP_FIELD in local)
	) {
		return DEFAULT_TIMESTAMP_FIELD;
	}
	return null;
}

function shouldApplyRemote(
	conflictPolicy: NonNullable<ApplyRemoteChangesOptions["conflictPolicy"]>,
	options: {
		hasOutboxEntry: boolean;
		local: SyncRecord | null;
		remote: SyncRecord;
		syncTimestampField?: string;
	},
): boolean {
	if (conflictPolicy === "skip-existing" && options.local) {
		return false;
	}
	if (conflictPolicy === "client-wins" && options.hasOutboxEntry) {
		return false;
	}
	if (conflictPolicy === "last-write-wins" && options.local) {
		const field = resolveTimestampField(
			options.local,
			options.remote,
			options.syncTimestampField,
		);
		if (!field) {
			return true;
		}
		const localTs = readTimestamp(options.local, field);
		const remoteTs = readTimestamp(options.remote, field);
		if (localTs === null) {
			return true;
		}
		if (remoteTs === null) {
			return false;
		}
		return remoteTs >= localTs;
	}
	return true;
}

/**
 * Applies remote sync changes inside an active write transaction.
 */
export async function applyRemoteChangesInWrite<Schema extends MelonSchema>(
	tx: WriteContext<Schema>,
	schema: MelonSchema,
	outbox: SyncOutboxStore,
	changes: SyncChanges,
	options?: ApplyRemoteChangesOptions,
): Promise<void> {
	validateSyncChanges(changes);
	const conflictPolicy = options?.conflictPolicy ?? "server-wins";

	for (const [collectionName, changeSet] of Object.entries(changes)) {
		if (!(collectionName in schema.collections)) {
			throw new MelonError(
				`Unknown collection "${collectionName}" in sync changes`,
				{
					code: MelonErrorCode.SYNC_PROTOCOL_INVALID,
				},
			);
		}

		const collection = tx.collection(collectionName);
		const meta = schema.getCollection(collectionName);
		const pk = meta.primaryKey;

		for (const record of changeSet.created) {
			const id = record[pk];
			if (id === undefined || id === null) {
				throw new MelonError(
					`Remote created record missing primary key "${pk}" on "${collectionName}"`,
					{ code: MelonErrorCode.SYNC_APPLY_FAILED },
				);
			}
			const existing = await collection.findById(id as string | number);
			const outboxEntry = await outbox.findByRecord(
				collectionName,
				id as string | number,
			);
			if (
				!shouldApplyRemote(conflictPolicy, {
					hasOutboxEntry: outboxEntry !== null,
					local: existing,
					remote: record,
					syncTimestampField: options?.syncTimestampField,
				})
			) {
				continue;
			}
			if (existing) {
				await collection.update(id as string | number, record);
			} else {
				await collection.insert(record);
			}
			await clearOutboxForRemoteRecord(
				outbox,
				collectionName,
				id as string | number,
			);
		}

		for (const record of changeSet.updated) {
			const id = record[pk];
			if (id === undefined || id === null) {
				throw new MelonError(
					`Remote updated record missing primary key "${pk}" on "${collectionName}"`,
					{ code: MelonErrorCode.SYNC_APPLY_FAILED },
				);
			}
			const existing = await collection.findById(id as string | number);
			const outboxEntry = await outbox.findByRecord(
				collectionName,
				id as string | number,
			);
			if (
				!shouldApplyRemote(conflictPolicy, {
					hasOutboxEntry: outboxEntry !== null,
					local: existing,
					remote: record,
					syncTimestampField: options?.syncTimestampField,
				})
			) {
				continue;
			}
			if (existing) {
				await collection.update(id as string | number, record);
			} else {
				await collection.insert(record);
			}
			await clearOutboxForRemoteRecord(
				outbox,
				collectionName,
				id as string | number,
			);
		}

		for (const id of changeSet.deleted) {
			const existing = await collection.findById(id);
			if (existing) {
				await collection.delete(id);
			}
			await clearOutboxForRemoteRecord(outbox, collectionName, id);
		}
	}
}
