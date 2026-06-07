import type {
	AdapterCountResult,
	AdapterFindResult,
	AdapterWriteOperation,
	InitializeOptions,
	MelonSchema,
	MetaStore,
	PreparedQuery,
	QueryExecutionDebug,
	StorageAdapter,
	SyncOutboxStore,
} from "@melon-db/db";
import { MelonError, MelonErrorCode } from "@melon-db/db";
import {
	ensureMetaTable,
	getStoredSchemaVersion,
	runMigrationsWithExecutor,
} from "@melon-db/db";
import { SCHEMA_VERSION_KEY } from "@melon-db/db";
import type { SqliteDriver } from "./driver.ts";
import { createSqliteMigrationExecutor } from "./migration-executor.ts";
import {
	createQuerySubscriptionRegistry,
	drainObservationEventsOnly,
	fetchRowByPrimaryKey,
	flushObservationQueue as flushObservationQueueFromEvents,
	invalidateForWrite,
} from "./observe/index.ts";
import {
	registerNativeObservationFlush,
	unregisterNativeObservationFlush,
} from "./observe/observation-callback.ts";
import {
	ensureObservationTriggers,
	resetObservationTriggerCache,
} from "./observe/triggers.ts";
import { registerSqliteDriverForTests } from "./testing.ts";
import { generateDdl } from "./schema-ddl.ts";
import { toSqlParams } from "./sql/bindings.ts";
import { compileQuery } from "./sql/compile-query.ts";
import {
	generateSyncOutboxDdl,
	migrateSyncOutboxPendingFieldsColumn,
} from "./sync-outbox-ddl.ts";
import { createSqliteSyncOutboxStore } from "./sync-outbox-store.ts";

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
	let syncOutboxStore: SyncOutboxStore | undefined;
	let metaStore: MetaStore | undefined;
	const subscriptionRegistry = createQuerySubscriptionRegistry();

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

	async function afterWriteInvalidation(
		sqlite: SqliteDriver,
		s: MelonSchema,
		operation: AdapterWriteOperation,
		context: {
			oldRow?: Record<string, unknown> | null;
			newRow?: Record<string, unknown> | null;
		},
	): Promise<void> {
		if (
			operation.type !== "batch" &&
			subscriptionRegistry.getSubscriptionsAffectedByCollection(
				operation.collection,
			).length > 0
		) {
			await ensureObservationTriggers(sqlite, s, operation.collection);
		}

		await invalidateForWrite(
			sqlite,
			s,
			subscriptionRegistry,
			operation,
			context,
		);
		await drainObservationEventsOnly(sqlite);
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
		const pk = meta.primaryKey;

		if (operation.type === "insert") {
			const keys = Object.keys(operation.values);
			const cols = keys.map((k) => `"${k}"`).join(", ");
			const placeholders = keys.map(() => "?").join(", ");
			const sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`;
			emitDebug({ sql, params: keys.map((k) => operation.values[k]) });
			await sqlite.run(sql, toSqlParams(keys.map((k) => operation.values[k])));

			const id = operation.values[pk] as string | number | undefined;
			const newRow =
				id !== undefined
					? await fetchRowByPrimaryKey(sqlite, operation.collection, pk, id)
					: (operation.values as Record<string, unknown>);

			await afterWriteInvalidation(sqlite, s, operation, {
				newRow: newRow ?? operation.values,
			});
			return;
		}

		if (operation.type === "update") {
			const oldRow = await fetchRowByPrimaryKey(
				sqlite,
				operation.collection,
				pk,
				operation.primaryKey,
			);

			const keys = Object.keys(operation.values);
			const setClause = keys.map((k) => `"${k}" = ?`).join(", ");
			const sql = `UPDATE ${table} SET ${setClause} WHERE "${pk}" = ?`;
			const params = [
				...keys.map((k) => operation.values[k]),
				operation.primaryKey,
			];
			emitDebug({ sql, params });
			await sqlite.run(sql, toSqlParams(params));

			const newRow = await fetchRowByPrimaryKey(
				sqlite,
				operation.collection,
				pk,
				operation.primaryKey,
			);

			await afterWriteInvalidation(sqlite, s, operation, { oldRow, newRow });
			return;
		}

		if (operation.type === "delete") {
			const oldRow = await fetchRowByPrimaryKey(
				sqlite,
				operation.collection,
				pk,
				operation.id,
			);

			const sql = `DELETE FROM ${table} WHERE "${pk}" = ?`;
			emitDebug({ sql, params: [operation.id] });
			await sqlite.run(sql, toSqlParams([operation.id]));

			await afterWriteInvalidation(sqlite, s, operation, { oldRow });
		}
	}

	const adapter: StorageAdapter = {
		name: "sqlite",
		capabilities: {
			transactions: true,
			reactiveSubscriptions: true,
			jsonFields: true,
			joins: false,
			partialSelect: false,
		},

		get syncOutbox() {
			return syncOutboxStore;
		},

		get meta() {
			return metaStore;
		},

		async initialize(
			s: MelonSchema,
			options?: InitializeOptions,
		): Promise<void> {
			const isFirstInit = driver === null;
			schema = s;
			subscriptionRegistry.setSchema(s);
			if (isFirstInit) {
				driver = await driverFactory();
				registerSqliteDriverForTests(adapter, driver);
				await driver.exec("PRAGMA foreign_keys = ON");
				await driver.exec("PRAGMA journal_mode = WAL");
			}

			const sqlite = requireDriver();
			const hooks = await ensureMetaTable(
				(sql) => sqlite.exec(sql),
				(sql, params) => sqlite.queryFirst(sql, toSqlParams(params ?? [])),
				(sql, params) => sqlite.run(sql, toSqlParams(params ?? [])),
			);
			metaStore = hooks;

			for (const ddl of generateDdl(s)) {
				await sqlite.exec(ddl);
			}

			if (options?.sync) {
				for (const ddl of generateSyncOutboxDdl()) {
					await sqlite.exec(ddl);
				}
				await migrateSyncOutboxPendingFieldsColumn(
					(sql, params) =>
						sqlite.queryAll(sql, toSqlParams([...(params ?? [])])),
					(sql) => sqlite.exec(sql),
				);
				syncOutboxStore = createSqliteSyncOutboxStore(sqlite);
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
			const compiled = compileQuery(query, requireSchema());
			emitDebug({ sql: compiled.sql, params: compiled.params });
			const rows = await sqlite.queryAll(
				compiled.sql,
				toSqlParams(compiled.params),
			);
			return { rows };
		},

		async count(query: PreparedQuery): Promise<AdapterCountResult> {
			const sqlite = requireDriver();
			const s = requireSchema();
			const compiled = compileQuery(
				{
					...query,
					ast: { ...query.ast, mode: "count" },
				},
				s,
			);
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

		observeQuery(prepared, onChange) {
			const collection = prepared.ast.collection;
			if (driver !== null && schema !== null) {
				registerNativeObservationFlush(driver, schema, subscriptionRegistry);
				void ensureObservationTriggers(driver, schema, collection).catch(() => {
					// Triggers are best-effort; direct invalidation remains primary.
				});
			}
			return subscriptionRegistry.subscribe(prepared, onChange);
		},

		async flushObservationQueue(): Promise<void> {
			const sqlite = driver;
			const s = schema;
			if (sqlite === null || s === null) {
				throw new MelonError("Adapter not initialized", {
					code: MelonErrorCode.NOT_INITIALIZED,
				});
			}
			await flushObservationQueueFromEvents(sqlite, s, subscriptionRegistry);
		},

		getLastQueryDebug(): QueryExecutionDebug | undefined {
			return lastQueryDebug;
		},

		async close(): Promise<void> {
			if (driver !== null) {
				unregisterNativeObservationFlush(driver);
			}
			subscriptionRegistry.clear();
			resetObservationTriggerCache();
			await driver?.close();
			driver = null;
			schema = null;
			syncOutboxStore = undefined;
			metaStore = undefined;
			lastQueryDebug = undefined;
		},
	};

	return adapter;
}
