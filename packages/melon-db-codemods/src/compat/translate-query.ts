import {
	MelonError,
	MelonErrorCode,
	type QueryAst,
	type QueryBooleanNode,
	type QuerySort,
	and,
	or,
	predicate,
	queryAst,
} from "@melon/db";
import type { WatermelonQueryClause } from "./types.ts";

const UNSUPPORTED_REMEDIATION =
	"Melon v1 does not support Watermelon join queries (Q.on). Use belongsTo includes or manual filtering.";

/**
 * Throws when a clause type is not supported by the compat translator.
 */
function assertSupportedClause(clause: WatermelonQueryClause): void {
	if (clause.type === "on") {
		throw new MelonError(
			`Unsupported Watermelon clause: Q.on('${clause.table}', ...)`,
			{
				code: MelonErrorCode.QUERY_INVALID,
				remediation: UNSUPPORTED_REMEDIATION,
			},
		);
	}
	if (clause.type === "experimentalJoinTables") {
		throw new MelonError(
			"Unsupported Watermelon clause: Q.experimentalJoinTables",
			{
				code: MelonErrorCode.QUERY_INVALID,
				remediation: UNSUPPORTED_REMEDIATION,
			},
		);
	}
	if (clause.type === "experimentalNestedJoin") {
		throw new MelonError(
			"Unsupported Watermelon clause: Q.experimentalNestedJoin",
			{
				code: MelonErrorCode.QUERY_INVALID,
				remediation: UNSUPPORTED_REMEDIATION,
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
): QueryAst {
	let where: QueryBooleanNode | undefined;
	const orderBy: QuerySort[] = [];
	let skip: number | undefined;
	let limit: number | undefined;

	const filterClauses: WatermelonQueryClause[] = [];

	for (const clause of clauses) {
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
		mode: "many",
	});
}

/**
 * Translates an unknown Watermelon query description into QueryAst.
 */
export function queryDescriptionToAst(
	collection: string,
	input: unknown,
): QueryAst {
	return translateWatermelonQuery(collection, parseQueryDescription(input));
}
