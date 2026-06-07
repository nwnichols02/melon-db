import type { QueryOperator } from "@melon-db/db";

const SQL_OPERATOR_MAP: Record<QueryOperator, string> = {
	eq: "=",
	neq: "!=",
	gt: ">",
	gte: ">=",
	lt: "<",
	lte: "<=",
	in: "IN",
	notIn: "NOT IN",
	like: "LIKE",
	contains: "LIKE",
	isNull: "IS NULL",
};

/**
 * Maps Melon query operators to SQL tokens.
 */
export function sqlOperator(op: QueryOperator): string {
	return SQL_OPERATOR_MAP[op];
}
