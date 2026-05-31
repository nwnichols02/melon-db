export { MelonError, MelonErrorCode } from "./errors.ts";
export type { MelonErrorOptions } from "./errors.ts";

export {
	createMelonSchema,
	type MelonScalar,
	type FieldDefinition,
	type RelationDefinition,
	type CollectionSchemaDefinition,
	type DatabaseSchemaDefinition,
	type CollectionMetadata,
	type MelonSchema,
} from "./schema.ts";

export {
	type QueryOperator,
	type QueryPredicate,
	type QueryBooleanNode,
	type QuerySort,
	type QueryRelationInclude,
	type QuerySelect,
	type QueryAst,
	type QueryPlan,
	type PreparedQuerySource,
	type PreparedQuery,
	predicate,
	and,
	or,
	not,
	queryAst,
} from "./ast.ts";

export type {
	AdapterRecord,
	AdapterFindResult,
	AdapterCountResult,
	AdapterWriteOperation,
	AdapterChangeSet,
	StorageAdapterCapabilities,
	StorageAdapter,
	QueryExecutionDebug,
	InitializeOptions,
	MetaStore,
} from "./adapter.ts";

export { validateQuery } from "./query/validator.ts";
export { planQuery } from "./query/planner.ts";
export { prepareQuery } from "./query/prepare.ts";
export { evaluateQuery } from "./query/evaluate.ts";
export { loadIncludes } from "./query/load-includes.ts";

export type {
	DevtoolsBridge,
	QueryDebugSnapshot,
	SyncDebugSnapshot,
} from "./devtools.ts";
export { SyncDebugPhase } from "./devtools.ts";

export type {
	ApplyRemoteChangesOptions,
	GetLocalChangesOptions,
	SyncChanges,
	SyncConfig,
	SyncOutboxEntry,
	SyncOutboxOperation,
	SyncOutboxStore,
	SyncRecord,
} from "./sync/types.ts";
export {
	SYNC_LAST_PULLED_AT_KEY,
	createMemoryCheckpointStore,
	createMetaCheckpointStore,
	type CheckpointStore,
} from "./sync/checkpoint.ts";
export { createMemorySyncOutboxStore } from "./sync/outbox-store.ts";
export { validateSyncChanges } from "./sync/get-local-changes.ts";

export type {
	InsertInput,
	UpdateInput,
	CollectionRecord,
	MelonQueryHandle,
	MelonCollection,
	ReadContext,
	WriteContext,
	MelonDatabase,
	CreateDatabaseOptions,
} from "./database/types.ts";

export {
	type Migration,
	type MigrationStep,
	type MigrationAdapterHooks,
	type MigrationStepExecutor,
	META_TABLE,
	SCHEMA_VERSION_KEY,
	CREATE_META_TABLE_SQL,
} from "./migrations/types.ts";
export {
	runMigrationsWithExecutor,
	getStoredSchemaVersion,
} from "./migrations/runner.ts";
export {
	ensureMetaTable,
	createSqlMigrationHooks,
} from "./migrations/meta-store.ts";
export { createInMemoryMigrationExecutor } from "./migrations/in-memory-executor.ts";
export { createDatabase } from "./database/create-database.ts";
export { createInMemoryAdapter } from "./adapters/in-memory/adapter.ts";
export { ChangeEmitter } from "./change/emitter.ts";
