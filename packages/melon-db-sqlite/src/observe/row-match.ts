import type { QueryAst, QueryBooleanNode } from "@melon/db";
import { evaluateQuery } from "@melon/db";

/**
 * Returns whether a row satisfies a query WHERE clause (in-memory, matches SQL compiler semantics).
 */
export function rowMatchesWhere(
	collection: string,
	row: Record<string, unknown>,
	where: QueryBooleanNode | undefined,
): boolean {
	const ast: QueryAst = { collection, mode: "many", where };
	return evaluateQuery(ast, [row]).length > 0;
}
