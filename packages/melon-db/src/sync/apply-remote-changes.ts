import type { WriteContext } from "../database/types.ts";
import { MelonError, MelonErrorCode } from "../errors.ts";
import type { MelonSchema } from "../schema.ts";
import { validateSyncChanges } from "./get-local-changes.ts";
import { clearOutboxForRemoteRecord } from "./ledger.ts";
import { mergeRemoteWithPendingFields } from "./merge-remote-record.ts";
import type {
	ApplyRemoteChangesOptions,
	ConflictResolver,
	ConflictResolverContext,
	ConflictResolverResult,
	SyncChanges,
	SyncOutboxEntry,
	SyncOutboxStore,
	SyncRecord,
} from "./types.ts";
import { SyncOutboxOperation as Op } from "./types.ts";

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
	conflictPolicy: NonNullable<
		Exclude<ApplyRemoteChangesOptions["conflictPolicy"], "custom">
	>,
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

function shouldSkipMergeByFieldApply(
	outboxEntry: SyncOutboxEntry | null,
): boolean {
	if (!outboxEntry) {
		return false;
	}
	return (
		outboxEntry.operation === Op.Created || outboxEntry.operation === Op.Deleted
	);
}

function resolvePayloadForApply(
	conflictPolicy: NonNullable<
		Exclude<ApplyRemoteChangesOptions["conflictPolicy"], "custom">
	>,
	options: {
		local: SyncRecord | null;
		remote: SyncRecord;
		outboxEntry: SyncOutboxEntry | null;
		primaryKey: string;
		mergeRemoteFields?: string[];
		mergeProtectedFields?: string[];
	},
): SyncRecord {
	if (conflictPolicy !== "merge-by-field") {
		return options.remote;
	}
	if (shouldSkipMergeByFieldApply(options.outboxEntry)) {
		return options.remote;
	}
	return mergeRemoteWithPendingFields({
		local: options.local,
		remote: options.remote,
		pendingFields: options.outboxEntry?.pendingFields,
		primaryKey: options.primaryKey,
		mergeRemoteFields: options.mergeRemoteFields,
		mergeProtectedFields: options.mergeProtectedFields,
	});
}

async function resolveWithCustomResolver(
	resolver: ConflictResolver,
	ctx: ConflictResolverContext,
): Promise<ConflictResolverResult> {
	return resolver(ctx);
}

async function maybeClearOutboxAfterApply(
	outbox: SyncOutboxStore,
	clearOutbox: boolean,
	collectionName: string,
	recordId: string | number,
): Promise<void> {
	if (!clearOutbox) {
		return;
	}
	await clearOutboxForRemoteRecord(outbox, collectionName, recordId);
}

async function applyCustomResolverResult(
	tx: WriteContext<MelonSchema>,
	collectionName: string,
	pk: string,
	recordId: string | number,
	result: ConflictResolverResult,
	outbox: SyncOutboxStore,
): Promise<void> {
	if (result.action === "skip") {
		return;
	}
	const collection = tx.collection(collectionName);
	const existing = await collection.findById(recordId);
	if (existing) {
		await collection.update(recordId, result.record);
	} else {
		await collection.insert(result.record);
	}
	await maybeClearOutboxAfterApply(
		outbox,
		result.clearOutbox !== false,
		collectionName,
		recordId,
	);
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

	if (conflictPolicy === "custom" && !options?.conflictResolver) {
		throw new MelonError('conflictPolicy "custom" requires conflictResolver', {
			code: MelonErrorCode.SYNC_APPLY_FAILED,
		});
	}

	const customResolver = options?.conflictResolver;
	const builtInConflictPolicy: NonNullable<
		Exclude<ApplyRemoteChangesOptions["conflictPolicy"], "custom">
	> =
		conflictPolicy === "custom"
			? "server-wins"
			: (conflictPolicy ?? "server-wins");

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

		if (customResolver) {
			for (const record of changeSet.created) {
				const id = record[pk];
				if (id === undefined || id === null) {
					throw new MelonError(
						`Remote created record missing primary key "${pk}" on "${collectionName}"`,
						{ code: MelonErrorCode.SYNC_APPLY_FAILED },
					);
				}
				const recordId = id as string | number;
				const existing = await collection.findById(recordId);
				const outboxEntry = await outbox.findByRecord(collectionName, recordId);
				const result = await resolveWithCustomResolver(customResolver, {
					collection: collectionName,
					recordId,
					operation: "created",
					primaryKey: pk,
					local: existing,
					remote: record,
					outboxEntry,
				});
				await applyCustomResolverResult(
					tx,
					collectionName,
					pk,
					recordId,
					result,
					outbox,
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
				const recordId = id as string | number;
				const existing = await collection.findById(recordId);
				const outboxEntry = await outbox.findByRecord(collectionName, recordId);
				const result = await resolveWithCustomResolver(customResolver, {
					collection: collectionName,
					recordId,
					operation: "updated",
					primaryKey: pk,
					local: existing,
					remote: record,
					outboxEntry,
				});
				await applyCustomResolverResult(
					tx,
					collectionName,
					pk,
					recordId,
					result,
					outbox,
				);
			}

			for (const id of changeSet.deleted) {
				const outboxEntry = await outbox.findByRecord(collectionName, id);
				const existing = await collection.findById(id);
				const result = await resolveWithCustomResolver(customResolver, {
					collection: collectionName,
					recordId: id,
					operation: "deleted",
					primaryKey: pk,
					local: existing,
					remote: { [pk]: id },
					outboxEntry,
				});
				if (result.action === "skip") {
					continue;
				}
				if (existing) {
					await collection.delete(id);
				}
				await maybeClearOutboxAfterApply(
					outbox,
					result.clearOutbox !== false,
					collectionName,
					id,
				);
			}
			continue;
		}

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
			if (builtInConflictPolicy === "merge-by-field") {
				if (shouldSkipMergeByFieldApply(outboxEntry)) {
					continue;
				}
			} else if (
				!shouldApplyRemote(builtInConflictPolicy, {
					hasOutboxEntry: outboxEntry !== null,
					local: existing,
					remote: record,
					syncTimestampField: options?.syncTimestampField,
				})
			) {
				continue;
			}
			const payload = resolvePayloadForApply(builtInConflictPolicy, {
				local: existing,
				remote: record,
				outboxEntry,
				primaryKey: pk,
				mergeRemoteFields: options?.mergeRemoteFields,
				mergeProtectedFields: options?.mergeProtectedFields,
			});
			if (existing) {
				await collection.update(id as string | number, payload);
			} else {
				await collection.insert(payload);
			}
			await maybeClearOutboxAfterApply(
				outbox,
				builtInConflictPolicy !== "merge-by-field",
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
			if (builtInConflictPolicy === "merge-by-field") {
				if (shouldSkipMergeByFieldApply(outboxEntry)) {
					continue;
				}
			} else if (
				!shouldApplyRemote(builtInConflictPolicy, {
					hasOutboxEntry: outboxEntry !== null,
					local: existing,
					remote: record,
					syncTimestampField: options?.syncTimestampField,
				})
			) {
				continue;
			}
			const payload = resolvePayloadForApply(builtInConflictPolicy, {
				local: existing,
				remote: record,
				outboxEntry,
				primaryKey: pk,
				mergeRemoteFields: options?.mergeRemoteFields,
				mergeProtectedFields: options?.mergeProtectedFields,
			});
			if (existing) {
				await collection.update(id as string | number, payload);
			} else {
				await collection.insert(payload);
			}
			await maybeClearOutboxAfterApply(
				outbox,
				builtInConflictPolicy !== "merge-by-field",
				collectionName,
				id as string | number,
			);
		}

		for (const id of changeSet.deleted) {
			const outboxEntry = await outbox.findByRecord(collectionName, id);
			if (
				builtInConflictPolicy === "merge-by-field" &&
				outboxEntry?.operation === Op.Deleted
			) {
				await maybeClearOutboxAfterApply(outbox, false, collectionName, id);
				continue;
			}
			if (
				builtInConflictPolicy === "merge-by-field" &&
				outboxEntry?.operation === Op.Created
			) {
				continue;
			}
			const existing = await collection.findById(id);
			if (existing) {
				await collection.delete(id);
			}
			await maybeClearOutboxAfterApply(
				outbox,
				builtInConflictPolicy !== "merge-by-field",
				collectionName,
				id,
			);
		}
	}
}
