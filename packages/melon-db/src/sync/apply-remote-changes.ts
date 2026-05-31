import type { WriteContext } from "../database/types.ts";
import { MelonError, MelonErrorCode } from "../errors.ts";
import type { MelonSchema } from "../schema.ts";
import { validateSyncChanges } from "./get-local-changes.ts";
import { clearOutboxForRemoteRecord } from "./ledger.ts";
import type {
	ApplyRemoteChangesOptions,
	SyncChanges,
	SyncOutboxStore,
} from "./types.ts";

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
			if (existing && conflictPolicy === "skip-existing") {
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
			if (existing && conflictPolicy === "skip-existing") {
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
