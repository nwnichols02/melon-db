import type { MelonSchema, PreparedQuery, QueryAst } from "@melon/db";
import { prepareQuery } from "@melon/db";
import type { PrismaFindManyArgs } from "@melon/db-prisma";
import { resolveCollectionQuery } from "@melon/db-query";
import type { QueryBuilder } from "@melon/db-query";
import { normalizeMangoQuery } from "@melon/db-query-mango";
import type { MangoQuery } from "@melon/db-query-mango";

/**
 * Type guard for PreparedQuery vs bare QueryAst.
 */
export function isPreparedQuery(
	query: QueryAst | PreparedQuery,
): query is PreparedQuery {
	return (
		typeof query === "object" &&
		query !== null &&
		"ast" in query &&
		"plan" in query
	);
}

/**
 * Stable JSON key for a query AST (avoids effect churn from new object identities).
 */
export function queryAstKey(ast: QueryAst): string {
	return JSON.stringify(ast);
}

/**
 * Stable key for QueryAst or PreparedQuery hook inputs.
 */
export function queryInputKey(query: QueryAst | PreparedQuery): string {
	const ast = isPreparedQuery(query) ? query.ast : query;
	return queryAstKey(ast);
}

/**
 * Resolves hook input to PreparedQuery.
 */
export function resolvePreparedQuery(
	query: QueryAst | PreparedQuery,
	schema: MelonSchema,
): PreparedQuery {
	if (isPreparedQuery(query)) {
		return query;
	}
	return prepareQuery(query, schema);
}

/**
 * Stable key for Mango query hook inputs.
 */
export function mangoQueryKey(query: MangoQuery): string {
	return JSON.stringify(normalizeMangoQuery(query));
}

/**
 * Stable key for Prisma findMany args.
 */
export function prismaArgsKey(args: PrismaFindManyArgs | undefined): string {
	return args === undefined ? "" : JSON.stringify(args);
}

/**
 * Stable key for fluent builder callbacks (serializes resulting AST).
 */
export function fluentBuilderKey<RecordShape>(
	collection: string,
	builder: (q: QueryBuilder<RecordShape>) => QueryBuilder<RecordShape>,
): string {
	return queryAstKey(resolveCollectionQuery(collection, builder));
}
