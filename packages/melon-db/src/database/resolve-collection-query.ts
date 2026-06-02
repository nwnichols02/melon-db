import { resolveCollectionQuery } from "@melon/db-query";
import type { QueryAst } from "../ast.ts";
import type { CollectionQueryInput } from "./query-input.ts";

/**
 * Resolves QueryAst, a `() => QueryAst` thunk, or a fluent builder callback.
 */
export function resolveCollectionQueryInput<
	RecordShape = Record<string, unknown>,
>(
	collection: string,
	input: QueryAst | CollectionQueryInput<RecordShape> | undefined,
	defaultAst: () => QueryAst,
): QueryAst {
	if (input === undefined) {
		return defaultAst();
	}
	if (typeof input !== "function") {
		return input;
	}
	return resolveCollectionQuery(
		collection,
		input as import("@melon/db-query").CollectionQueryInput<RecordShape>,
		defaultAst().mode,
	);
}
