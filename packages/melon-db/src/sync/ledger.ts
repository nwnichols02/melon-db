import type { AdapterWriteOperation } from "../adapter.ts";
import type { MelonSchema } from "../schema.ts";
import { createOutboxEntryId } from "./outbox-store.ts";
import type { SyncConfig, SyncOutboxEntry, SyncOutboxStore } from "./types.ts";
import { SyncOutboxOperation as Op } from "./types.ts";

function isLocalOnlyCollection(
	schema: MelonSchema,
	collection: string,
	config: SyncConfig,
): boolean {
	if (config.respectLocalOnly === false) {
		return false;
	}
	const meta = schema.collections[collection];
	return meta?.localOnly === true;
}

function recordIdFromOperation(
	operation: AdapterWriteOperation,
	schema: MelonSchema,
): { collection: string; recordId: string | number } | null {
	if (operation.type === "batch") {
		return null;
	}

	const meta = schema.getCollection(operation.collection);

	if (operation.type === "insert") {
		const id = operation.values[meta.primaryKey];
		if (id === undefined || id === null) {
			return null;
		}
		return {
			collection: operation.collection,
			recordId: id as string | number,
		};
	}

	if (operation.type === "update") {
		return { collection: operation.collection, recordId: operation.primaryKey };
	}

	if (operation.type === "delete") {
		return { collection: operation.collection, recordId: operation.id };
	}

	return null;
}

/**
 * Records a local write in the sync outbox with coalescing semantics.
 */
export async function recordSyncOutboxWrite(
	store: SyncOutboxStore,
	schema: MelonSchema,
	config: SyncConfig,
	operation: AdapterWriteOperation,
): Promise<void> {
	if (operation.type === "batch") {
		for (const child of operation.operations) {
			await recordSyncOutboxWrite(store, schema, config, child);
		}
		return;
	}

	if (isLocalOnlyCollection(schema, operation.collection, config)) {
		return;
	}

	const ids = recordIdFromOperation(operation, schema);
	if (!ids) {
		return;
	}

	const { collection, recordId } = ids;
	const existing = (await store.list()).find(
		(entry) =>
			entry.collection === collection &&
			String(entry.recordId) === String(recordId),
	);

	if (operation.type === "insert") {
		const entry: SyncOutboxEntry = {
			id: createOutboxEntryId(),
			collection,
			recordId,
			operation: Op.Created,
			timestamp: Date.now(),
		};
		await store.upsert(entry);
		return;
	}

	if (operation.type === "update") {
		if (existing?.operation === Op.Created) {
			return;
		}
		const entry: SyncOutboxEntry = {
			id: existing?.id ?? createOutboxEntryId(),
			collection,
			recordId,
			operation: Op.Updated,
			timestamp: Date.now(),
		};
		await store.upsert(entry);
		return;
	}

	if (operation.type === "delete") {
		if (existing?.operation === Op.Created) {
			await store.removeByRecord(collection, recordId);
			return;
		}
		const entry: SyncOutboxEntry = {
			id: existing?.id ?? createOutboxEntryId(),
			collection,
			recordId,
			operation: Op.Deleted,
			timestamp: Date.now(),
		};
		await store.upsert(entry);
	}
}

/**
 * Removes outbox entries for records applied from remote changes.
 */
export async function clearOutboxForRemoteRecord(
	store: SyncOutboxStore,
	collection: string,
	recordId: string | number,
): Promise<void> {
	await store.removeByRecord(collection, recordId);
}
