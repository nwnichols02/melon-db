import type { QueryAst, QueryPlan, QuerySort } from "../ast.ts";
import type { MelonSchema } from "../schema.ts";

/**
 * Builds a query execution plan from AST and schema indexes.
 */
export function planQuery(ast: QueryAst, schema: MelonSchema): QueryPlan {
	const meta = schema.getCollection(ast.collection);
	const stableSort: QuerySort[] = ast.orderBy ? [...ast.orderBy] : [];

	let indexHint: string[] | undefined;
	if (meta.indexes.length > 0 && ast.orderBy?.[0]) {
		const sortField = ast.orderBy[0].field;
		const matching = meta.indexes.find((idx) => idx[0] === sortField);
		if (matching) {
			indexHint = [...matching];
		}
	}

	return {
		indexHint,
		postFilter: Boolean(ast.where),
		stableSort,
	};
}
