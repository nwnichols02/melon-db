import type { AdapterRecord, StorageAdapter } from "../adapter.ts";
import type { PreparedQuery, QueryAst } from "../ast.ts";
import { predicate, queryAst } from "../ast.ts";
import type { MelonSchema } from "../schema.ts";
import type { RelationDefinition } from "../schema.ts";
import { prepareQuery } from "./prepare.ts";

function loadBelongsToInclude(
	result: AdapterRecord[],
	relationName: string,
	relation: RelationDefinition,
	includeSpec: {
		where?: QueryAst["where"];
		orderBy?: QueryAst["orderBy"];
		limit?: number;
	},
	schema: MelonSchema,
	adapter: StorageAdapter,
): Promise<void> {
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
		return Promise.resolve();
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
	return adapter.find(prepared).then((relatedResult) => {
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
	});
}

function loadHasManyInclude(
	result: AdapterRecord[],
	relationName: string,
	relation: RelationDefinition,
	includeSpec: {
		where?: QueryAst["where"];
		orderBy?: QueryAst["orderBy"];
		limit?: number;
	},
	parentMeta: ReturnType<MelonSchema["getCollection"]>,
	schema: MelonSchema,
	adapter: StorageAdapter,
): Promise<void> {
	const foreignKey = relation.foreignKey;
	const parentIds = [
		...new Set(
			result.map((row) => row[parentMeta.primaryKey] as string | number),
		),
	];

	if (parentIds.length === 0) {
		for (const row of result) {
			row[relationName] = [];
		}
		return Promise.resolve();
	}

	const relatedAst = queryAst(relation.target, {
		where: predicate(foreignKey, "in", parentIds),
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
	return adapter.find(prepared).then((relatedResult) => {
		const grouped = new Map<string | number, AdapterRecord[]>();
		for (const parentId of parentIds) {
			grouped.set(parentId, []);
		}

		for (const relatedRow of relatedResult.rows) {
			const fk = relatedRow[foreignKey] as string | number | null | undefined;
			if (fk === null || fk === undefined) {
				continue;
			}
			const bucket = grouped.get(fk);
			if (bucket) {
				bucket.push(relatedRow);
			}
		}

		for (const row of result) {
			const parentId = row[parentMeta.primaryKey] as string | number;
			row[relationName] = grouped.get(parentId) ?? [];
		}
	});
}

/**
 * Loads belongsTo and hasMany relations and attaches nested data on parent rows.
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

	const loaders: Promise<void>[] = [];

	for (const [relationName, includeSpec] of Object.entries(includes)) {
		const relation = collectionMeta.relations[relationName];
		if (!relation) {
			continue;
		}

		if (relation.kind === "belongsTo") {
			loaders.push(
				loadBelongsToInclude(
					result,
					relationName,
					relation,
					includeSpec,
					schema,
					adapter,
				),
			);
			continue;
		}

		if (relation.kind === "hasMany") {
			loaders.push(
				loadHasManyInclude(
					result,
					relationName,
					relation,
					includeSpec,
					collectionMeta,
					schema,
					adapter,
				),
			);
		}
	}

	await Promise.all(loaders);

	return result;
}
