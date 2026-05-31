import type { MelonCollection } from "../database/types.ts";
import { MelonError, MelonErrorCode } from "../errors.ts";
import type { MelonSchema } from "../schema.ts";
import type {
	GetLocalChangesOptions,
	SyncChanges,
	SyncConfig,
	SyncOutboxStore,
	SyncRecord,
} from "./types.ts";
import { SyncOutboxOperation as Op } from "./types.ts";

function isSyncableCollection(
	schema: MelonSchema,
	collection: string,
	config: SyncConfig,
): boolean {
	if (config.respectLocalOnly !== false) {
		const meta = schema.collections[collection];
		if (meta?.localOnly) {
			return false;
		}
	}
	return collection in schema.collections;
}

/**
 * Builds Watermelon-compatible local changes from the sync outbox.
 */
export async function getLocalChangesFromOutbox(
	store: SyncOutboxStore,
	schema: MelonSchema,
	config: SyncConfig,
	getCollection: (name: string) => MelonCollection,
	options?: GetLocalChangesOptions,
): Promise<SyncChanges> {
	const filter = options?.collections ? new Set(options.collections) : null;
	const entries = await store.list();
	const changes: SyncChanges = {};

	for (const entry of entries) {
		if (!isSyncableCollection(schema, entry.collection, config)) {
			continue;
		}
		if (filter && !filter.has(entry.collection)) {
			continue;
		}

		let bucket = changes[entry.collection];
		if (!bucket) {
			bucket = {
				created: [],
				updated: [],
				deleted: [],
			};
			changes[entry.collection] = bucket;
		}

		if (entry.operation === Op.Deleted) {
			bucket.deleted.push(String(entry.recordId));
			continue;
		}

		const record = await getCollection(entry.collection).findById(
			entry.recordId,
		);
		if (!record) {
			continue;
		}

		const payload = record as SyncRecord;
		if (entry.operation === Op.Created) {
			bucket.created.push(payload);
		} else {
			bucket.updated.push(payload);
		}
	}

	return changes;
}

/**
 * Validates that a SyncChanges payload has the expected shape.
 */
export function validateSyncChanges(changes: SyncChanges): void {
	for (const [collection, changeSet] of Object.entries(changes)) {
		if (!changeSet || typeof changeSet !== "object") {
			throw new MelonError(`Invalid sync changes for "${collection}"`, {
				code: MelonErrorCode.SYNC_PROTOCOL_INVALID,
			});
		}
		if (
			!Array.isArray(changeSet.created) ||
			!Array.isArray(changeSet.updated) ||
			!Array.isArray(changeSet.deleted)
		) {
			throw new MelonError(
				`Sync changes for "${collection}" must include created, updated, and deleted arrays`,
				{
					code: MelonErrorCode.SYNC_PROTOCOL_INVALID,
					remediation:
						"Ensure pull/push payloads follow the Watermelon sync protocol shape.",
				},
			);
		}
	}
}
