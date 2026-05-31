import type {
	AdapterCountResult,
	AdapterFindResult,
	AdapterWriteOperation,
	StorageAdapter,
} from "../../adapter.ts";
import type { PreparedQuery } from "../../ast.ts";
import { MelonError, MelonErrorCode } from "../../errors.ts";
import { evaluateQuery } from "../../query/evaluate.ts";
import type { MelonSchema } from "../../schema.ts";
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

		async initialize(s: MelonSchema): Promise<void> {
			schema = s;
			data = createEmptyStore(s);
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
			const filtered = evaluateQuery(query.ast, rows);
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
			schema = null;
		},

		getData(): InMemoryData {
			return data;
		},
	};

	return adapter;
}
