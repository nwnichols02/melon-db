import type {
  AdapterCountResult,
  AdapterFindResult,
  AdapterWriteOperation,
  MelonSchema,
  PreparedQuery,
  StorageAdapter,
} from '@melon/db';
import { MelonError, MelonErrorCode } from '@melon/db';
import { Database, type SQLQueryBindings } from 'bun:sqlite';
import { compileQuery } from './sql/compile-query.ts';
import { generateDdl } from './schema-ddl.ts';

export interface SqliteAdapterOptions {
  filename: string;
  debug?: boolean;
}

function toSqlParams(params: unknown[]): SQLQueryBindings[] {
  return params as SQLQueryBindings[];
}

/**
 * Creates a SQLite StorageAdapter using bun:sqlite (Node/Bun).
 */
export function createSqliteAdapter(options: SqliteAdapterOptions): StorageAdapter {
  let db: Database | null = null;
  let schema: MelonSchema | null = null;

  function requireDb(): Database {
    if (!db) {
      throw new MelonError('Adapter not initialized', { code: MelonErrorCode.NOT_INITIALIZED });
    }
    return db;
  }

  return {
    name: 'sqlite',
    capabilities: {
      transactions: true,
      reactiveSubscriptions: false,
      jsonFields: true,
      joins: false,
      partialSelect: false,
    },

    async initialize(s: MelonSchema): Promise<void> {
      schema = s;
      db = new Database(options.filename);
      db.exec('PRAGMA foreign_keys = ON');
      for (const ddl of generateDdl(s)) {
        db.exec(ddl);
      }
    },

    async prepare(query: PreparedQuery): Promise<PreparedQuery> {
      return query;
    },

    async find(query: PreparedQuery): Promise<AdapterFindResult> {
      const sqlite = requireDb();
      const compiled = compileQuery(query);
      const stmt = sqlite.query(compiled.sql);
      const rows = stmt.all(...toSqlParams(compiled.params)) as Record<string, unknown>[];
      return { rows };
    },

    async count(query: PreparedQuery): Promise<AdapterCountResult> {
      const sqlite = requireDb();
      const compiled = compileQuery({ ...query, ast: { ...query.ast, mode: 'count' } });
      const stmt = sqlite.query(compiled.sql);
      const row = stmt.get(...toSqlParams(compiled.params)) as { count: number };
      return { count: Number(row.count) };
    },

    async write(operation: AdapterWriteOperation): Promise<void> {
      const sqlite = requireDb();
      if (!schema) {
        throw new MelonError('Adapter not initialized', { code: MelonErrorCode.NOT_INITIALIZED });
      }

      if (operation.type === 'batch') {
        sqlite.exec('BEGIN');
        try {
          for (const op of operation.operations) {
            await this.write(op);
          }
          sqlite.exec('COMMIT');
        } catch (error) {
          sqlite.exec('ROLLBACK');
          throw error;
        }
        return;
      }

      const meta = schema.getCollection(operation.collection);
      const table = `"${operation.collection}"`;

      if (operation.type === 'insert') {
        const keys = Object.keys(operation.values);
        const cols = keys.map((k) => `"${k}"`).join(', ');
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`;
        sqlite.query(sql).run(...toSqlParams(keys.map((k) => operation.values[k])));
        return;
      }

      if (operation.type === 'update') {
        const keys = Object.keys(operation.values);
        const setClause = keys.map((k) => `"${k}" = ?`).join(', ');
        const sql = `UPDATE ${table} SET ${setClause} WHERE "${meta.primaryKey}" = ?`;
        sqlite
          .query(sql)
          .run(...toSqlParams([...keys.map((k) => operation.values[k]), operation.primaryKey]));
        return;
      }

      if (operation.type === 'delete') {
        const sql = `DELETE FROM ${table} WHERE "${meta.primaryKey}" = ?`;
        sqlite.query(sql).run(operation.id);
      }
    },

    async transaction<T>(fn: () => Promise<T>): Promise<T> {
      const sqlite = requireDb();
      sqlite.exec('BEGIN');
      try {
        const result = await fn();
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },

    async close(): Promise<void> {
      db?.close();
      db = null;
      schema = null;
    },
  };
}
