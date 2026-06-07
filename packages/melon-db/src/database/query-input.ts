import type { QueryAst } from "../ast.ts";

/**
 * Fluent builder callback shape (implemented by @melon-db/db-query QueryBuilder).
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
	and(
		group: (
			builder: QueryBuilderLike<RecordShape>,
		) => QueryBuilderLike<RecordShape>,
	): QueryBuilderLike<RecordShape>;
	or(
		group: (
			builder: QueryBuilderLike<RecordShape>,
		) => QueryBuilderLike<RecordShape>,
	): QueryBuilderLike<RecordShape>;
	not(
		group: (
			builder: QueryBuilderLike<RecordShape>,
		) => QueryBuilderLike<RecordShape>,
	): QueryBuilderLike<RecordShape>;
	orderBy(
		field: keyof RecordShape & string,
		direction?: "asc" | "desc",
	): QueryBuilderLike<RecordShape>;
	limit(value: number): QueryBuilderLike<RecordShape>;
	skip(value: number): QueryBuilderLike<RecordShape>;
	toAst(mode?: QueryAst["mode"]): QueryAst;
}
