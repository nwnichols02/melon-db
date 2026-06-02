import type { AdapterRecord } from "../adapter.ts";
import type { QueryAst } from "../ast.ts";
import type { MelonSchema } from "../schema.ts";
import { evaluateQuery } from "./evaluate.ts";

/**
 * Applies relationFilters by constraining parent rows to those whose FK matches
 * related rows satisfying the nested where clause.
 */
export function applyRelationFilters(
	parentRows: AdapterRecord[],
	ast: QueryAst,
	schema: MelonSchema,
	getRelatedRows: (collection: string) => AdapterRecord[],
): AdapterRecord[] {
	if (!ast.relationFilters || ast.relationFilters.length === 0) {
		return parentRows;
	}

	let result = parentRows;
	const meta = schema.getCollection(ast.collection);

	for (const relationFilter of ast.relationFilters) {
		const relation = meta.relations[relationFilter.relation];
		if (!relation || relation.kind !== "belongsTo") {
			continue;
		}

		const relatedRows = getRelatedRows(relation.target);
		const matchingRelated = evaluateQuery(
			{
				collection: relation.target,
				where: relationFilter.where,
				mode: "many",
			},
			relatedRows,
		);

		const targetMeta = schema.getCollection(relation.target);
		const matchingIds = new Set(
			matchingRelated.map(
				(row) => row[targetMeta.primaryKey] as string | number,
			),
		);

		result = result.filter((row) => {
			const fk = row[relation.foreignKey] as string | number | null | undefined;
			if (fk === null || fk === undefined) {
				return false;
			}
			return matchingIds.has(fk);
		});
	}

	return result;
}
