import type { QueryAst } from "@melon/db";
import { QueryBuilder } from "./query-builder.ts";

export type CollectionQueryInput<RecordShape = Record<string, unknown>> =
	| QueryAst
	| (() => QueryAst)
	| ((builder: QueryBuilder<RecordShape>) => QueryBuilder<RecordShape>);

/**
 * Resolves a collection query from either a QueryAst or a fluent builder callback.
 */
export function resolveCollectionQuery<RecordShape = Record<string, unknown>>(
	collection: string,
	input?: CollectionQueryInput<RecordShape>,
	defaultMode: QueryAst["mode"] = "many",
): QueryAst {
	if (input === undefined) {
		return { collection, mode: defaultMode };
	}
	if (typeof input === "function") {
		if (input.length === 0) {
			return (input as () => QueryAst)();
		}
		const builderFn = input as (
			builder: QueryBuilder<RecordShape>,
		) => QueryBuilder<RecordShape>;
		return builderFn(new QueryBuilder<RecordShape>(collection)).toAst(
			defaultMode,
		);
	}
	return { ...input, collection };
}
