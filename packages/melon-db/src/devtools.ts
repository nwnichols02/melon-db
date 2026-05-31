import type { AdapterWriteOperation } from './adapter.ts';
import type { PreparedQuery, QueryAst, QueryPlan } from './ast.ts';

export interface QueryDebugSnapshot {
  source: PreparedQuery['source'];
  input: unknown;
  ast: QueryAst;
  plan: QueryPlan;
  sql?: string;
  durationMs?: number;
}

export interface DevtoolsBridge {
  emitQuery(snapshot: QueryDebugSnapshot): void;
  emitWrite(operation: AdapterWriteOperation): void;
  emitSubscription(event: { collection: string; active: boolean }): void;
  emitError(error: Error & { code?: string }): void;
}
