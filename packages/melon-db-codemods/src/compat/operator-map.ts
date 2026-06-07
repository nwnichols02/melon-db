import type { QueryOperator } from "@melon-db/db";

/** Maps WatermelonDB Q operator names to Melon QueryOperator values. */
export const WATERMELON_OPERATOR_MAP = {
	eq: "eq",
	notEq: "neq",
	gt: "gt",
	gte: "gte",
	lt: "lt",
	lte: "lte",
	like: "like",
	oneOf: "in",
	notIn: "notIn",
} as const satisfies Record<string, QueryOperator>;

export type WatermelonOperatorName = keyof typeof WATERMELON_OPERATOR_MAP;

/**
 * Resolves a Watermelon Q operator name to a Melon query operator.
 */
export function mapWatermelonOperator(name: string): QueryOperator {
	const mapped = WATERMELON_OPERATOR_MAP[name as WatermelonOperatorName];
	if (!mapped) {
		throw new Error(`Unsupported Watermelon operator: ${name}`);
	}
	return mapped;
}
