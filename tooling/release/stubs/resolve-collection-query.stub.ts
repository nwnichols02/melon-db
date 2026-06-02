import type { QueryAst } from "../ast.ts";
import type { CollectionQueryInput } from "./query-input.ts";

/** Build-time stub; full module restored after @melon/db-query is built. */
export function resolveCollectionQueryInput<RecordShape = Record<string, unknown>>(
  _collection: string,
  input: QueryAst | CollectionQueryInput<RecordShape> | undefined,
  defaultAst: () => QueryAst,
): QueryAst {
  if (input === undefined) return defaultAst();
  if (typeof input !== "function") return input;
  return defaultAst();
}
