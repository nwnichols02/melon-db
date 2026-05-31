import type {
	AdapterCountResult,
	AdapterFindResult,
	AdapterWriteOperation,
	InitializeOptions,
	MelonSchema,
	PreparedQuery,
	QueryExecutionDebug,
	StorageAdapter,
} from "@melon/db";
import { MelonError, MelonErrorCode } from "@melon/db";
import {
	ensureMetaTable,
	getStoredSchemaVersion,
	runMigrationsWithExecutor,
} from "@melon/db";
import { SCHEMA_VERSION_KEY } from "@melon/db";
import type { SqliteDriver } from "./driver.ts";
import { createSqliteMigrationExecutor } from "./migration-executor.ts";
import { generateDdl } from "./schema-ddl.ts";
import { toSqlParams } from "./sql/bindings.ts";
import { compileQuery } from "./sql/compile-query.ts";

export interface SqliteAdapterCoreOptions {
	debug?: boolean;
	/** Called when debug is true after find/count/write SQL. */
	onQueryDebug?: (debug: QueryExecutionDebug) => void;
}

/**
 * Creates a StorageAdapter backed by a platform-specific SqliteDriver.
 */
export function createSqliteAdapterFromDriver(
	driverFactory: () => Promise<SqliteDriver>,
	options: SqliteAdapterCoreOptions = {},
): StorageAdapter {
	const { debug = false, onQueryDebug } = options;
	let driver: SqliteDriver | null = null;
	let schema: MelonSchema | null = null;
	let lastQueryDebug: QueryExecutionDebug | undefined;

	function emitDebug(debugInfo: QueryExecutionDebug): void {
		lastQueryDebug = debugInfo;
		if (debug && onQueryDebug) {
			onQueryDebug(debugInfo);
		}
	}

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
			for (const op of operation.operations) {
				await writeOperation(op);
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
			emitDebug({ sql, params: keys.map((k) => operation.values[k]) });
			await sqlite.run(sql, toSqlParams(keys.map((k) => operation.values[k])));
			return;
		}

		if (operation.type === "update") {
			const keys = Object.keys(operation.values);
			const setClause = keys.map((k) => `"${k}" = ?`).join(", ");
			const sql = `UPDATE ${table} SET ${setClause} WHERE "${meta.primaryKey}" = ?`;
			const params = [
				...keys.map((k) => operation.values[k]),
				operation.primaryKey,
			];
			emitDebug({ sql, params });
			await sqlite.run(sql, toSqlParams(params));
			return;
		}

		if (operation.type === "delete") {
			const sql = `DELETE FROM ${table} WHERE "${meta.primaryKey}" = ?`;
			emitDebug({ sql, params: [operation.id] });
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

		async initialize(
			s: MelonSchema,
			options?: InitializeOptions,
		): Promise<void> {
			const isFirstInit = driver === null;
			schema = s;
			if (isFirstInit) {
				driver = await driverFactory();
				await driver.exec("PRAGMA foreign_keys = ON");
				await driver.exec("PRAGMA journal_mode = WAL");
			}

			const sqlite = requireDriver();
			const hooks = await ensureMetaTable(
				(sql) => sqlite.exec(sql),
				(sql, params) => sqlite.queryFirst(sql, toSqlParams(params ?? [])),
				(sql, params) => sqlite.run(sql, toSqlParams(params ?? [])),
			);

			for (const ddl of generateDdl(s)) {
				await sqlite.exec(ddl);
			}

			if (options?.migrations?.length) {
				await runMigrationsWithExecutor(
					s,
					options.migrations,
					hooks,
					createSqliteMigrationExecutor(sqlite),
				);
				return;
			}

			const stored = await getStoredSchemaVersion(hooks);
			if (stored === 0) {
				await hooks.setMeta(SCHEMA_VERSION_KEY, String(s.version));
			}
		},

		async prepare(query: PreparedQuery): Promise<PreparedQuery> {
			return query;
		},

		async find(query: PreparedQuery): Promise<AdapterFindResult> {
			const sqlite = requireDriver();
			const compiled = compileQuery(query);
			emitDebug({ sql: compiled.sql, params: compiled.params });
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
			emitDebug({ sql: compiled.sql, params: compiled.params });
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
