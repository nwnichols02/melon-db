import type {
	AdapterCountResult,
	AdapterFindResult,
	AdapterWriteOperation,
	InitializeOptions,
	StorageAdapter,
} from "../../adapter.ts";
import type { PreparedQuery } from "../../ast.ts";
import { MelonError, MelonErrorCode } from "../../errors.ts";
import { createInMemoryMigrationExecutor } from "../../migrations/in-memory-executor.ts";
import {
	getStoredSchemaVersion,
	runMigrationsWithExecutor,
} from "../../migrations/runner.ts";
import { SCHEMA_VERSION_KEY } from "../../migrations/types.ts";
import { applyRelationFilters } from "../../query/apply-relation-filters.ts";
import { evaluateQuery } from "../../query/evaluate.ts";
import type { MelonSchema } from "../../schema.ts";
import { createMemorySyncOutboxStore } from "../../sync/outbox-store.ts";
import type { SyncOutboxStore } from "../../sync/types.ts";
import { type InMemoryData, createEmptyStore } from "./store.ts";

let idCounter = 0;

function nextId(): string {
	idCounter += 1;
	return `local_${idCounter}`;
}

/**
 * Creates an in-memory StorageAdapter for tests and local development.
 */
export function createInMemoryAdapter(): StorageAdapter & {
	getData(): InMemoryData;
} {
	let schema: MelonSchema | null = null;
	let data: InMemoryData = new Map();
	let metaStore = new Map<string, string>();
	let syncOutboxStore: SyncOutboxStore | undefined;

	function requireSchema(): MelonSchema {
		if (!schema) {
			throw new MelonError("Adapter not initialized", {
				code: MelonErrorCode.NOT_INITIALIZED,
			});
		}
		return schema;
	}

	function applyWrite(op: AdapterWriteOperation): void {
		const s = requireSchema();

		if (op.type === "batch") {
			for (const child of op.operations) {
				applyWrite(child);
			}
			return;
		}

		const store = data.get(op.collection);
		if (!store) {
			throw new MelonError(`Unknown collection "${op.collection}"`, {
				code: MelonErrorCode.ADAPTER_ERROR,
			});
		}

		const meta = s.getCollection(op.collection);
		const pk = meta.primaryKey;

		if (op.type === "insert") {
			const id = (op.values[pk] as string | number | undefined) ?? nextId();
			const record = { ...op.values, [pk]: id };
			store.set(id, record);
			return;
		}

		if (op.type === "update") {
			const existing = store.get(op.primaryKey);
			if (!existing) {
				throw new MelonError(`Record "${op.primaryKey}" not found`, {
					code: MelonErrorCode.RECORD_NOT_FOUND,
				});
			}
			const record = { ...existing, ...op.values, [pk]: op.primaryKey };
			store.set(op.primaryKey, record);
			return;
		}

		if (op.type === "delete") {
			if (!store.has(op.id)) {
				throw new MelonError(`Record "${op.id}" not found`, {
					code: MelonErrorCode.RECORD_NOT_FOUND,
				});
			}
			store.delete(op.id);
		}
	}

	const adapter: StorageAdapter & {
		getData(): InMemoryData;
	} = {
		name: "in-memory",
		capabilities: {
			transactions: true,
			reactiveSubscriptions: false,
			jsonFields: true,
			joins: false,
			partialSelect: false,
		},

		get syncOutbox() {
			return syncOutboxStore;
		},

		async initialize(
			s: MelonSchema,
			options?: InitializeOptions,
		): Promise<void> {
			const isReinit = schema !== null;
			schema = s;
			if (!isReinit) {
				data = createEmptyStore(s);
				metaStore = new Map();
			}

			const hooks = {
				execSql: async (_sql: string): Promise<void> => {},
				getMeta: async (key: string): Promise<string | null> =>
					metaStore.get(key) ?? null,
				setMeta: async (key: string, value: string): Promise<void> => {
					metaStore.set(key, value);
				},
			};

			if (options?.migrations?.length) {
				await runMigrationsWithExecutor(
					s,
					options.migrations,
					hooks,
					createInMemoryMigrationExecutor(data, s),
				);
			} else {
				const stored = await getStoredSchemaVersion(hooks);
				if (stored === 0) {
					await hooks.setMeta(SCHEMA_VERSION_KEY, String(s.version));
				}
			}

			if (options?.sync) {
				syncOutboxStore = createMemorySyncOutboxStore();
			}
			return;
		},

		async prepare(query: PreparedQuery): Promise<PreparedQuery> {
			return query;
		},

		async find(query: PreparedQuery): Promise<AdapterFindResult> {
			const s = requireSchema();
			const store = data.get(query.ast.collection);
			if (!store) {
				return { rows: [] };
			}
			const rows = [...store.values()];
			const afterRelationFilters = applyRelationFilters(
				rows,
				query.ast,
				s,
				(collection) => {
					const relatedStore = data.get(collection);
					return relatedStore ? [...relatedStore.values()] : [];
				},
			);
			const filtered = evaluateQuery(query.ast, afterRelationFilters);
			const meta = s.getCollection(query.ast.collection);
			if (query.ast.select?.fields) {
				const fields = new Set([meta.primaryKey, ...query.ast.select.fields]);
				return {
					rows: filtered.map((row) => {
						const projected: Record<string, unknown> = {};
						for (const field of fields) {
							projected[field] = row[field];
						}
						return projected;
					}),
				};
			}
			return { rows: filtered };
		},

		async count(query: PreparedQuery): Promise<AdapterCountResult> {
			const result = await adapter.find({
				...query,
				ast: { ...query.ast, mode: "many" },
			});
			return { count: result.rows.length };
		},

		async write(operation: AdapterWriteOperation): Promise<void> {
			applyWrite(operation);
		},

		async transaction<T>(fn: () => Promise<T>): Promise<T> {
			return fn();
		},

		async close(): Promise<void> {
			data = new Map();
			metaStore = new Map();
			syncOutboxStore = undefined;
			schema = null;
		},

		getData(): InMemoryData {
			return data;
		},
	};

	return adapter;
}
