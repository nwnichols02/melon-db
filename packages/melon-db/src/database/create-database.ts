import type { AdapterChangeSet, AdapterWriteOperation } from "../adapter.ts";
import { emitWriteChanges } from "../change/emit-write-change.ts";
import { ChangeEmitter } from "../change/emitter.ts";
import { MelonError, MelonErrorCode } from "../errors.ts";
import { applyRemoteChangesInWrite } from "../sync/apply-remote-changes.ts";
import {
	type CheckpointStore,
	createMemoryCheckpointStore,
	createMetaCheckpointStore,
} from "../sync/checkpoint.ts";
import { getLocalChangesFromOutbox } from "../sync/get-local-changes.ts";
import { recordSyncOutboxWrite } from "../sync/ledger.ts";
import { createMemorySyncOutboxStore } from "../sync/outbox-store.ts";
import type {
	ApplyRemoteChangesOptions,
	GetLocalChangesOptions,
	SyncChanges,
	SyncConfig,
	SyncOutboxStore,
} from "../sync/types.ts";
import { createCollection } from "./collection.ts";
import type {
	CollectionRecord,
	CreateDatabaseOptions,
	MelonCollection,
	MelonDatabase,
	ReadContext,
	WriteContext,
} from "./types.ts";
import { WriteQueue } from "./write-queue.ts";

function assertSyncEnabled(
	syncEnabled: boolean,
	syncOutbox: SyncOutboxStore | null,
): SyncOutboxStore {
	if (!syncEnabled || !syncOutbox) {
		throw new MelonError("Sync is not enabled for this database", {
			code: MelonErrorCode.SYNC_NOT_ENABLED,
			remediation: "Pass sync: {} to createDatabase() to enable sync APIs.",
		});
	}
	return syncOutbox;
}

/**
 * Creates a MelonDatabase instance wired to a storage adapter.
 */
export function createDatabase<
	Schema extends import("../schema.ts").MelonSchema,
>(options: CreateDatabaseOptions<Schema>): MelonDatabase<Schema> {
	const { schema, adapter, devtools, migrations, sync: syncConfig } = options;
	const syncEnabled = syncConfig !== undefined;
	const resolvedSyncConfig: SyncConfig = {
		respectLocalOnly: syncConfig?.respectLocalOnly ?? true,
	};
	const emitter = new ChangeEmitter();
	const writeQueue = new WriteQueue();
	let insideWrite = false;
	let applyingRemote = false;
	let initialized = false;
	let syncOutbox: SyncOutboxStore | null = null;
	let checkpointStoreCache: CheckpointStore | null = null;

	function buildCheckpointStore(): CheckpointStore {
		if (adapter.meta) {
			return createMetaCheckpointStore(adapter.meta);
		}
		return createMemoryCheckpointStore();
	}

	async function ensureInitialized(): Promise<void> {
		if (!initialized) {
			await adapter.initialize(schema, {
				migrations,
				sync: syncEnabled,
			});
			if (syncEnabled) {
				syncOutbox = adapter.syncOutbox ?? createMemorySyncOutboxStore();
				checkpointStoreCache = buildCheckpointStore();
			}
			initialized = true;
		}
	}

	async function handleSyncWrite(
		operation: AdapterWriteOperation,
	): Promise<void> {
		if (!syncEnabled || !syncOutbox || applyingRemote) {
			return;
		}
		await recordSyncOutboxWrite(
			syncOutbox,
			schema,
			resolvedSyncConfig,
			operation,
		);
	}

	function isInsideWrite(): boolean {
		return insideWrite;
	}

	function skipSyncOutbox(): boolean {
		return applyingRemote;
	}

	function collection<Name extends keyof Schema["collections"] & string>(
		name: Name,
	): MelonCollection<CollectionRecord> {
		const metadata = schema.getCollection(name);
		return createCollection({
			adapter,
			schema,
			metadata,
			emitter,
			devtools,
			isInsideWrite,
			skipSyncOutbox,
			onSyncWrite: handleSyncWrite,
			ensureReady: ensureInitialized,
		});
	}

	const readContext: ReadContext<Schema> = { collection };
	const writeContext: WriteContext<Schema> = {
		collection,
		async batch(operations: AdapterWriteOperation[]): Promise<void> {
			if (!insideWrite) {
				throw new MelonError("Writes must run inside db.write()", {
					code: MelonErrorCode.WRITE_OUTSIDE_TRANSACTION,
				});
			}
			const batchOp = { type: "batch" as const, operations };
			await adapter.write(batchOp);
			emitWriteChanges(emitter, schema, batchOp);
			await handleSyncWrite(batchOp);
		},
	};

	return {
		schema,
		adapter,

		collection,

		async read<T>(fn: (tx: ReadContext<Schema>) => Promise<T>): Promise<T> {
			await ensureInitialized();
			return fn(readContext);
		},

		async write<T>(fn: (tx: WriteContext<Schema>) => Promise<T>): Promise<T> {
			await ensureInitialized();
			return writeQueue.run(async () => {
				insideWrite = true;
				try {
					return await adapter.transaction(() => fn(writeContext));
				} finally {
					insideWrite = false;
				}
			});
		},

		observeCollections(
			names: string[],
			onChange: (changes: AdapterChangeSet) => void,
		): () => void {
			const set = new Set(names);
			return emitter.subscribeAll((change) => {
				if (!set.has(change.collection)) return;
				onChange({
					collections: {
						[change.collection]: {
							created: change.created,
							updated: change.updated,
							deleted: change.deleted,
						},
					},
				});
			});
		},

		async getLocalChanges(
			options?: GetLocalChangesOptions,
		): Promise<SyncChanges> {
			await ensureInitialized();
			const outbox = assertSyncEnabled(syncEnabled, syncOutbox);
			return getLocalChangesFromOutbox(
				outbox,
				schema,
				resolvedSyncConfig,
				(name) => collection(name),
				options,
			);
		},

		async applyRemoteChanges(
			changes: SyncChanges,
			applyOptions?: ApplyRemoteChangesOptions,
		): Promise<void> {
			await ensureInitialized();
			const outbox = assertSyncEnabled(syncEnabled, syncOutbox);
			await writeQueue.run(async () => {
				insideWrite = true;
				applyingRemote = true;
				try {
					await adapter.transaction(async () => {
						await applyRemoteChangesInWrite(
							writeContext,
							schema,
							outbox,
							changes,
							applyOptions,
						);
					});
				} finally {
					applyingRemote = false;
					insideWrite = false;
				}
			});
		},

		async markLocalChangesPushed(collections?: string[]): Promise<void> {
			await ensureInitialized();
			const outbox = assertSyncEnabled(syncEnabled, syncOutbox);
			await outbox.clear(collections);
		},

		createCheckpointStore(): CheckpointStore {
			if (!syncEnabled) {
				throw new MelonError("Sync is not enabled for this database", {
					code: MelonErrorCode.SYNC_NOT_ENABLED,
					remediation: "Pass sync: {} to createDatabase() to enable sync APIs.",
				});
			}
			if (checkpointStoreCache) {
				return checkpointStoreCache;
			}
			return buildCheckpointStore();
		},

		async unsafeReset(): Promise<void> {
			await adapter.close();
			initialized = false;
			syncOutbox = null;
			checkpointStoreCache = null;
			await ensureInitialized();
		},
	};
}
