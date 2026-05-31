export { MelonError, MelonErrorCode } from './errors.ts';
export type { MelonErrorOptions } from './errors.ts';

export {
  createMelonSchema,
  type MelonScalar,
  type FieldDefinition,
  type RelationDefinition,
  type CollectionSchemaDefinition,
  type DatabaseSchemaDefinition,
  type CollectionMetadata,
  type MelonSchema,
} from './schema.ts';

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
} from './ast.ts';

export {
  type AdapterRecord,
  type AdapterFindResult,
  type AdapterCountResult,
  type AdapterWriteOperation,
  type AdapterChangeSet,
  type StorageAdapterCapabilities,
  type StorageAdapter,
} from './adapter.ts';

export { validateQuery } from './query/validator.ts';
export { planQuery } from './query/planner.ts';
export { prepareQuery } from './query/prepare.ts';
export { evaluateQuery } from './query/evaluate.ts';

export type { DevtoolsBridge, QueryDebugSnapshot } from './devtools.ts';

export {
  type InsertInput,
  type UpdateInput,
  type CollectionRecord,
  type MelonQueryHandle,
  type MelonCollection,
  type ReadContext,
  type WriteContext,
  type MelonDatabase,
  type CreateDatabaseOptions,
} from './database/types.ts';

export { createDatabase } from './database/create-database.ts';
export { createInMemoryAdapter } from './adapters/in-memory/adapter.ts';
export { ChangeEmitter } from './change/emitter.ts';
