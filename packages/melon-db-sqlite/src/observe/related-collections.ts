import type { QueryAst } from "@melon/db";
import type { MelonSchema } from "@melon/db";

/**
 * Target collections referenced by belongsTo relationFilters on a query.
 */
export function resolveRelatedCollections(
	ast: QueryAst,
	schema: MelonSchema,
): string[] {
	if (!ast.relationFilters || ast.relationFilters.length === 0) {
		return [];
	}

	const meta = schema.getCollection(ast.collection);
	const related = new Set<string>();

	for (const relationFilter of ast.relationFilters) {
		const relation = meta.relations[relationFilter.relation];
		if (relation?.kind === "belongsTo") {
			related.add(relation.target);
		}
	}

	return [...related];
}
