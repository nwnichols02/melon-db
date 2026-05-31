import type { AdapterRecord, StorageAdapter } from "../adapter.ts";
import type { PreparedQuery, QueryAst } from "../ast.ts";
import { predicate, queryAst } from "../ast.ts";
import type { MelonSchema } from "../schema.ts";
import { prepareQuery } from "./prepare.ts";

/**
 * Loads belongsTo relations and attaches nested objects on parent rows.
 */
export async function loadIncludes(
	parentRows: AdapterRecord[],
	ast: QueryAst,
	schema: MelonSchema,
	adapter: StorageAdapter,
): Promise<AdapterRecord[]> {
	const includes = ast.select?.include;
	if (!includes || Object.keys(includes).length === 0) {
		return parentRows;
	}

	if (parentRows.length === 0) {
		return parentRows;
	}

	const collectionMeta = schema.getCollection(ast.collection);
	const result = parentRows.map((row) => ({ ...row }));

	for (const [relationName, includeSpec] of Object.entries(includes)) {
		const relation = collectionMeta.relations[relationName];
		if (!relation || relation.kind !== "belongsTo") {
			continue;
		}

		const foreignKey = relation.foreignKey;
		const targetMeta = schema.getCollection(relation.target);
		const fkValues = [
			...new Set(
				result
					.map((row) => row[foreignKey])
					.filter((value) => value !== null && value !== undefined),
			),
		];

		if (fkValues.length === 0) {
			for (const row of result) {
				row[relationName] = null;
			}
			continue;
		}

		const relatedAst = queryAst(relation.target, {
			where: predicate(targetMeta.primaryKey, "in", fkValues),
			orderBy: includeSpec.orderBy,
			limit: includeSpec.limit,
		});

		if (includeSpec.where && relatedAst.where) {
			relatedAst.where = {
				type: "and",
				nodes: [relatedAst.where, includeSpec.where],
			};
		} else if (includeSpec.where) {
			relatedAst.where = includeSpec.where;
		}

		const prepared: PreparedQuery = prepareQuery(relatedAst, schema, "melon");
		const relatedResult = await adapter.find(prepared);
		const relatedById = new Map<string | number, AdapterRecord>();
		for (const relatedRow of relatedResult.rows) {
			const id = relatedRow[targetMeta.primaryKey] as string | number;
			relatedById.set(id, relatedRow);
		}

		for (const row of result) {
			const fk = row[foreignKey] as string | number | null | undefined;
			row[relationName] =
				fk !== null && fk !== undefined ? (relatedById.get(fk) ?? null) : null;
		}
	}

	return result;
}
