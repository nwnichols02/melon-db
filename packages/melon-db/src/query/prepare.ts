import type { PreparedQuery, PreparedQuerySource, QueryAst } from "../ast.ts";
import type { MelonSchema } from "../schema.ts";
import { planQuery } from "./planner.ts";
import { validateQuery } from "./validator.ts";

/**
 * Validates and prepares a query for adapter execution.
 */
export function prepareQuery(
	ast: QueryAst,
	schema: MelonSchema,
	source: PreparedQuerySource = "melon",
): PreparedQuery {
	validateQuery(ast, schema);
	const plan = planQuery(ast, schema);
	return { ast, plan, source };
}
