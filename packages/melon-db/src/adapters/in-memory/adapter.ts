import type {
  AdapterCountResult,
  AdapterFindResult,
  AdapterWriteOperation,
  StorageAdapter,
} from '../../adapter.ts';
import type { PreparedQuery } from '../../ast.ts';
import type { ChangeEmitter, CollectionChange } from '../../change/emitter.ts';
import { MelonError, MelonErrorCode } from '../../errors.ts';
import { evaluateQuery } from '../../query/evaluate.ts';
import type { MelonSchema } from '../../schema.ts';
import { createEmptyStore, type InMemoryData } from './store.ts';

let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `local_${idCounter}`;
}

export interface InMemoryAdapterOptions {
  emitter?: ChangeEmitter;
}

/**
 * Creates an in-memory StorageAdapter for tests and local development.
 */
export function createInMemoryAdapter(options: InMemoryAdapterOptions = {}): StorageAdapter & {
  getData(): InMemoryData;
  setEmitter(emitter: ChangeEmitter): void;
} {
  let schema: MelonSchema | null = null;
  let data: InMemoryData = new Map();
  let emitter = options.emitter;

  function requireSchema(): MelonSchema {
    if (!schema) {
      throw new MelonError('Adapter not initialized', { code: MelonErrorCode.NOT_INITIALIZED });
    }
    return schema;
  }

  function emitChange(change: CollectionChange): void {
    emitter?.emit(change);
  }

  function applyWrite(op: AdapterWriteOperation): CollectionChange | null {
    const s = requireSchema();

    if (op.type === 'batch') {
      const merged: CollectionChange = {
        collection: '',
        created: [],
        updated: [],
        deleted: [],
      };
      for (const child of op.operations) {
        const change = applyWrite(child);
        if (change) {
          merged.collection = change.collection;
          merged.created.push(...change.created);
          merged.updated.push(...change.updated);
          merged.deleted.push(...change.deleted);
        }
      }
      if (merged.collection) {
        emitChange(merged);
        return merged;
      }
      return null;
    }

    const store = data.get(op.collection);
    if (!store) {
      throw new MelonError(`Unknown collection "${op.collection}"`, {
        code: MelonErrorCode.ADAPTER_ERROR,
      });
    }

    const meta = s.getCollection(op.collection);
    const pk = meta.primaryKey;

    if (op.type === 'insert') {
      const id = (op.values[pk] as string | number | undefined) ?? nextId();
      const record = { ...op.values, [pk]: id };
      store.set(id, record);
      const change: CollectionChange = { collection: op.collection, created: [id], updated: [], deleted: [] };
      emitChange(change);
      return change;
    }

    if (op.type === 'update') {
      const existing = store.get(op.primaryKey);
      if (!existing) {
        throw new MelonError(`Record "${op.primaryKey}" not found`, { code: MelonErrorCode.RECORD_NOT_FOUND });
      }
      const record = { ...existing, ...op.values, [pk]: op.primaryKey };
      store.set(op.primaryKey, record);
      const change: CollectionChange = {
        collection: op.collection,
        created: [],
        updated: [op.primaryKey],
        deleted: [],
      };
      emitChange(change);
      return change;
    }

    if (op.type === 'delete') {
      if (!store.has(op.id)) {
        throw new MelonError(`Record "${op.id}" not found`, { code: MelonErrorCode.RECORD_NOT_FOUND });
      }
      store.delete(op.id);
      const change: CollectionChange = {
        collection: op.collection,
        created: [],
        updated: [],
        deleted: [op.id],
      };
      emitChange(change);
      return change;
    }

    return null;
  }

  const adapter: StorageAdapter & { getData(): InMemoryData; setEmitter(emitter: ChangeEmitter): void } = {
    name: 'in-memory',
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
      const result = await adapter.find({ ...query, ast: { ...query.ast, mode: 'many' } });
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

    setEmitter(e: ChangeEmitter): void {
      emitter = e;
    },
  };

  return adapter;
}
