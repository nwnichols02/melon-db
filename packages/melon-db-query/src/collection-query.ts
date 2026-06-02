import type { QueryAst } from "@melon/db";
import { QueryBuilder } from "./query-builder.ts";

export type CollectionQueryInput<RecordShape = Record<string, unknown>> =
	| QueryAst
	| (() => QueryAst)
	| ((builder: QueryBuilder<RecordShape>) => QueryBuilder<RecordShape>);

function isAstFactory(
	input: CollectionQueryInput<unknown>,
): input is () => QueryAst {
	return typeof input === "function" && input.length === 0;
}

function isBuilderFactory<RecordShape>(
	input: CollectionQueryInput<RecordShape>,
): input is (
	builder: QueryBuilder<RecordShape>,
) => QueryBuilder<RecordShape> {
	return typeof input === "function" && input.length > 0;
}

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
		if (isAstFactory(input)) {
			return input();
		}
		if (isBuilderFactory(input)) {
			return input(new QueryBuilder<RecordShape>(collection)).toAst(
				defaultMode,
			);
		}
	}
	return { ...input, collection };
}
