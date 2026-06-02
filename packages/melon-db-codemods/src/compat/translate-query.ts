import {
	MelonError,
	MelonErrorCode,
	type MelonSchema,
	type QueryAst,
	type QueryBooleanNode,
	type QueryRelationFilter,
	type QuerySort,
	and,
	or,
	predicate,
	queryAst,
} from "@melon/db";
import type { WatermelonQueryClause } from "./types.ts";

const UNSUPPORTED_JOIN_REMEDIATION =
	"Melon does not support experimental Watermelon join tables. Use belongsTo relationFilters or includes.";

/**
 * Throws when a clause type is not supported by the compat translator.
 */
function assertSupportedClause(clause: WatermelonQueryClause): void {
	if (clause.type === "experimentalJoinTables") {
		throw new MelonError(
			"Unsupported Watermelon clause: Q.experimentalJoinTables",
			{
				code: MelonErrorCode.QUERY_INVALID,
				remediation: UNSUPPORTED_JOIN_REMEDIATION,
			},
		);
	}
	if (clause.type === "experimentalNestedJoin") {
		throw new MelonError(
			"Unsupported Watermelon clause: Q.experimentalNestedJoin",
			{
				code: MelonErrorCode.QUERY_INVALID,
				remediation: UNSUPPORTED_JOIN_REMEDIATION,
			},
		);
	}
}

/**
 * Converts a single Watermelon where-style clause into a boolean AST node.
 */
function clauseToBooleanNode(clause: WatermelonQueryClause): QueryBooleanNode {
	assertSupportedClause(clause);

	if (clause.type === "where") {
		const op = clause.op ?? "eq";
		if (op === "isNull") {
			return predicate(clause.field, "isNull");
		}
		return predicate(clause.field, op, clause.value);
	}

	if (clause.type === "and") {
		return and(...clause.clauses.map(clauseToBooleanNode));
	}

	if (clause.type === "or") {
		return or(...clause.clauses.map(clauseToBooleanNode));
	}

	if (clause.type === "on") {
		throw new MelonError(
			"Nested Q.on is not supported inside filter expressions",
			{
				code: MelonErrorCode.QUERY_INVALID,
				remediation: "Use Q.on only at the top level of a query description.",
			},
		);
	}

	throw new MelonError(
		`Clause type "${clause.type}" is not a filter expression`,
		{
			code: MelonErrorCode.QUERY_INVALID,
			remediation:
				"Use where, and, or clauses for filters; sortBy/skip/take are separate.",
		},
	);
}

/**
 * Parses Q.on condition payloads into a boolean filter on the related collection.
 */
function parseOnCondition(condition: unknown): QueryBooleanNode {
	if (Array.isArray(condition)) {
		const nodes = condition
			.filter(
				(item): item is WatermelonQueryClause =>
					typeof item === "object" && item !== null && "type" in item,
			)
			.map(clauseToBooleanNode);
		if (nodes.length === 0) {
			throw new MelonError("Q.on condition must include at least one filter", {
				code: MelonErrorCode.QUERY_INVALID,
			});
		}
		if (nodes.length === 1) {
			const single = nodes[0];
			if (!single) {
				throw new MelonError(
					"Q.on condition must include at least one filter",
					{
						code: MelonErrorCode.QUERY_INVALID,
					},
				);
			}
			return single;
		}
		return and(...nodes);
	}

	if (
		typeof condition === "object" &&
		condition !== null &&
		"type" in condition
	) {
		return clauseToBooleanNode(condition as WatermelonQueryClause);
	}

	throw new MelonError("Invalid Q.on condition shape", {
		code: MelonErrorCode.QUERY_INVALID,
		remediation:
			"Pass Q.where / Q.and / Q.or clauses as the second argument to Q.on.",
	});
}

/**
 * Resolves a belongsTo relation on the parent collection for Q.on(table, ...).
 */
function resolveBelongsToRelationName(
	schema: MelonSchema,
	collection: string,
	table: string,
): string {
	const meta = schema.getCollection(collection);
	const byName = meta.relations[table];
	if (byName?.kind === "belongsTo") {
		return table;
	}

	for (const [relationName, relation] of Object.entries(meta.relations)) {
		if (relation.kind === "belongsTo" && relation.target === table) {
			return relationName;
		}
	}

	throw new MelonError(
		`No belongsTo relation from "${collection}" to "${table}" for Q.on`,
		{
			code: MelonErrorCode.QUERY_INVALID,
			remediation:
				"Add a belongsTo relation in schema metadata, or pass the relation name as the Q.on table argument.",
		},
	);
}

/**
 * Validates and narrows unknown input to Watermelon query clauses.
 */
export function parseQueryDescription(input: unknown): WatermelonQueryClause[] {
	if (!Array.isArray(input)) {
		throw new MelonError("Query description must be an array of clauses", {
			code: MelonErrorCode.QUERY_INVALID,
			remediation:
				"Pass an array of serializable WatermelonQueryClause objects.",
		});
	}

	const clauses: WatermelonQueryClause[] = [];
	for (const item of input) {
		if (typeof item !== "object" || item === null || !("type" in item)) {
			throw new MelonError("Invalid query clause shape", {
				code: MelonErrorCode.QUERY_INVALID,
				remediation: "Each clause must be an object with a type field.",
			});
		}
		clauses.push(item as WatermelonQueryClause);
	}
	return clauses;
}

/**
 * Translates serializable Watermelon Q clauses into a Melon QueryAst.
 */
export function translateWatermelonQuery(
	collection: string,
	clauses: WatermelonQueryClause[],
	schema?: MelonSchema,
): QueryAst {
	let where: QueryBooleanNode | undefined;
	const orderBy: QuerySort[] = [];
	let skip: number | undefined;
	let limit: number | undefined;
	const relationFilters: QueryRelationFilter[] = [];

	const filterClauses: WatermelonQueryClause[] = [];

	for (const clause of clauses) {
		if (clause.type === "on") {
			if (!schema) {
				throw new MelonError(
					`Unsupported Watermelon clause: Q.on('${clause.table}', ...)`,
					{
						code: MelonErrorCode.QUERY_INVALID,
						remediation:
							"Pass MelonSchema to translateWatermelonQuery when using Q.on, or rewrite with relationFilters / two-step queries.",
					},
				);
			}
			relationFilters.push({
				relation: resolveBelongsToRelationName(
					schema,
					collection,
					clause.table,
				),
				where: parseOnCondition(clause.condition),
			});
			continue;
		}

		assertSupportedClause(clause);

		if (clause.type === "sortBy") {
			orderBy.push({ field: clause.field, direction: clause.direction });
			continue;
		}
		if (clause.type === "skip") {
			skip = clause.count;
			continue;
		}
		if (clause.type === "take") {
			limit = clause.count;
			continue;
		}
		filterClauses.push(clause);
	}

	if (filterClauses.length === 1) {
		const firstClause = filterClauses[0];
		if (firstClause) {
			where = clauseToBooleanNode(firstClause);
		}
	} else if (filterClauses.length > 1) {
		where = and(...filterClauses.map(clauseToBooleanNode));
	}

	return queryAst(collection, {
		where,
		orderBy: orderBy.length > 0 ? orderBy : undefined,
		skip,
		limit,
		relationFilters: relationFilters.length > 0 ? relationFilters : undefined,
		mode: "many",
	});
}

/**
 * Translates an unknown Watermelon query description into QueryAst.
 */
export function queryDescriptionToAst(
	collection: string,
	input: unknown,
	schema?: MelonSchema,
): QueryAst {
	return translateWatermelonQuery(
		collection,
		parseQueryDescription(input),
		schema,
	);
}
