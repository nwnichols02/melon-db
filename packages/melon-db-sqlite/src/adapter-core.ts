import type {
	AdapterCountResult,
	AdapterFindResult,
	AdapterWriteOperation,
	MelonSchema,
	PreparedQuery,
	QueryExecutionDebug,
	StorageAdapter,
} from "@melon/db";
import { MelonError, MelonErrorCode } from "@melon/db";
import type { SqliteDriver } from "./driver.ts";
import { generateDdl } from "./schema-ddl.ts";
import { toSqlParams } from "./sql/bindings.ts";
import { compileQuery } from "./sql/compile-query.ts";

export interface SqliteAdapterCoreOptions {
	debug?: boolean;
}

/**
 * Creates a StorageAdapter backed by a platform-specific SqliteDriver.
 */
export function createSqliteAdapterFromDriver(
	driverFactory: () => Promise<SqliteDriver>,
	options: SqliteAdapterCoreOptions = {},
): StorageAdapter {
	let driver: SqliteDriver | null = null;
	let schema: MelonSchema | null = null;
	let lastQueryDebug: QueryExecutionDebug | undefined;

	function requireDriver(): SqliteDriver {
		if (!driver) {
			throw new MelonError("Adapter not initialized", {
				code: MelonErrorCode.NOT_INITIALIZED,
			});
		}
		return driver;
	}

	function requireSchema(): MelonSchema {
		if (!schema) {
			throw new MelonError("Adapter not initialized", {
				code: MelonErrorCode.NOT_INITIALIZED,
			});
		}
		return schema;
	}

	async function writeOperation(
		operation: AdapterWriteOperation,
	): Promise<void> {
		const sqlite = requireDriver();
		const s = requireSchema();

		if (operation.type === "batch") {
			await sqlite.exec("BEGIN");
			try {
				for (const op of operation.operations) {
					await writeOperation(op);
				}
				await sqlite.exec("COMMIT");
			} catch (error) {
				await sqlite.exec("ROLLBACK");
				throw error;
			}
			return;
		}

		const meta = s.getCollection(operation.collection);
		const table = `"${operation.collection}"`;

		if (operation.type === "insert") {
			const keys = Object.keys(operation.values);
			const cols = keys.map((k) => `"${k}"`).join(", ");
			const placeholders = keys.map(() => "?").join(", ");
			const sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`;
			await sqlite.run(sql, toSqlParams(keys.map((k) => operation.values[k])));
			return;
		}

		if (operation.type === "update") {
			const keys = Object.keys(operation.values);
			const setClause = keys.map((k) => `"${k}" = ?`).join(", ");
			const sql = `UPDATE ${table} SET ${setClause} WHERE "${meta.primaryKey}" = ?`;
			await sqlite.run(
				sql,
				toSqlParams([
					...keys.map((k) => operation.values[k]),
					operation.primaryKey,
				]),
			);
			return;
		}

		if (operation.type === "delete") {
			const sql = `DELETE FROM ${table} WHERE "${meta.primaryKey}" = ?`;
			await sqlite.run(sql, toSqlParams([operation.id]));
		}
	}

	return {
		name: "sqlite",
		capabilities: {
			transactions: true,
			reactiveSubscriptions: false,
			jsonFields: true,
			joins: false,
			partialSelect: false,
		},

		async initialize(s: MelonSchema): Promise<void> {
			schema = s;
			driver = await driverFactory();
			await driver.exec("PRAGMA foreign_keys = ON");
			await driver.exec("PRAGMA journal_mode = WAL");
			for (const ddl of generateDdl(s)) {
				await driver.exec(ddl);
			}
			if (options.debug) {
				// reserved for future SQL logging
			}
		},

		async prepare(query: PreparedQuery): Promise<PreparedQuery> {
			return query;
		},

		async find(query: PreparedQuery): Promise<AdapterFindResult> {
			const sqlite = requireDriver();
			const compiled = compileQuery(query);
			lastQueryDebug = { sql: compiled.sql, params: compiled.params };
			const rows = await sqlite.queryAll(
				compiled.sql,
				toSqlParams(compiled.params),
			);
			return { rows };
		},

		async count(query: PreparedQuery): Promise<AdapterCountResult> {
			const sqlite = requireDriver();
			const compiled = compileQuery({
				...query,
				ast: { ...query.ast, mode: "count" },
			});
			lastQueryDebug = { sql: compiled.sql, params: compiled.params };
			const row = await sqlite.queryFirst(
				compiled.sql,
				toSqlParams(compiled.params),
			);
			return { count: Number(row?.count ?? 0) };
		},

		async write(operation: AdapterWriteOperation): Promise<void> {
			await writeOperation(operation);
		},

		async transaction<T>(fn: () => Promise<T>): Promise<T> {
			return requireDriver().transaction(fn);
		},

		getLastQueryDebug(): QueryExecutionDebug | undefined {
			return lastQueryDebug;
		},

		async close(): Promise<void> {
			await driver?.close();
			driver = null;
			schema = null;
			lastQueryDebug = undefined;
		},
	};
}
