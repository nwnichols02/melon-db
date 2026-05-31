import type { AdapterChangeSet, AdapterWriteOperation } from "../adapter.ts";
import { emitWriteChanges } from "../change/emit-write-change.ts";
import { ChangeEmitter } from "../change/emitter.ts";
import { MelonError, MelonErrorCode } from "../errors.ts";
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

/**
 * Creates a MelonDatabase instance wired to a storage adapter.
 */
export function createDatabase<
	Schema extends import("../schema.ts").MelonSchema,
>(options: CreateDatabaseOptions<Schema>): MelonDatabase<Schema> {
	const { schema, adapter, devtools, migrations } = options;
	const emitter = new ChangeEmitter();
	const writeQueue = new WriteQueue();
	let insideWrite = false;
	let initialized = false;

	async function ensureInitialized(): Promise<void> {
		if (!initialized) {
			await adapter.initialize(schema, { migrations });
			initialized = true;
		}
	}

	function isInsideWrite(): boolean {
		return insideWrite;
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

		async unsafeReset(): Promise<void> {
			await adapter.close();
			initialized = false;
			await ensureInitialized();
		},
	};
}
