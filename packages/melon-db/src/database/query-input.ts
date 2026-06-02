import type { QueryAst } from "../ast.ts";

/**
 * Fluent builder callback shape (implemented by @melon/db-query QueryBuilder).
 */
export type CollectionQueryInput<RecordShape = Record<string, unknown>> =
	| QueryAst
	| (() => QueryAst)
	| ((builder: QueryBuilderLike<RecordShape>) => QueryBuilderLike<RecordShape>);

export interface QueryBuilderLike<RecordShape = Record<string, unknown>> {
	where(
		field: keyof RecordShape & string,
		op: import("../ast.ts").QueryOperator,
		value?: unknown,
	): QueryBuilderLike<RecordShape>;
	toAst(mode?: QueryAst["mode"]): QueryAst;
}
