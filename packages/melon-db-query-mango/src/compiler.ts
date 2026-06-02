import {
	MelonError,
	MelonErrorCode,
	type MelonSchema,
	type PreparedQuery,
	type QueryAst,
	type QueryBooleanNode,
	type QueryOperator,
	planQuery,
	validateQuery,
} from "@melon/db";
import { normalizeMangoQuery } from "./normalizer.ts";
import type { MangoQuery, MangoSelector } from "./types.ts";

const MANGO_OP_MAP: Record<string, QueryOperator> = {
	$eq: "eq",
	$ne: "neq",
	$gt: "gt",
	$gte: "gte",
	$lt: "lt",
	$lte: "lte",
	$in: "in",
	$nin: "notIn",
	$like: "like",
};

function compileSelector(selector: MangoSelector): QueryBooleanNode {
	const nodes: QueryBooleanNode[] = [];

	for (const [key, value] of Object.entries(selector)) {
		if (key === "$and" && Array.isArray(value)) {
			nodes.push({
				type: "and",
				nodes: value.map((s) => compileSelector(s as MangoSelector)),
			});
			continue;
		}
		if (key === "$or" && Array.isArray(value)) {
			nodes.push({
				type: "or",
				nodes: value.map((s) => compileSelector(s as MangoSelector)),
			});
			continue;
		}
		if (key === "$not" && typeof value === "object" && value !== null) {
			nodes.push({
				type: "not",
				node: compileSelector(value as MangoSelector),
			});
			continue;
		}

		if (typeof value === "object" && value !== null && !Array.isArray(value)) {
			for (const [opKey, opValue] of Object.entries(
				value as Record<string, unknown>,
			)) {
				const melonOp = MANGO_OP_MAP[opKey];
				if (!melonOp) {
					throw new MelonError(`Unsupported Mango operator "${opKey}"`, {
						code: MelonErrorCode.QUERY_INVALID,
					});
				}
				nodes.push({
					type: "predicate",
					predicate: { field: key, op: melonOp, value: opValue },
				});
			}
			continue;
		}

		nodes.push({
			type: "predicate",
			predicate: { field: key, op: "eq", value },
		});
	}

	if (nodes.length === 0) {
		throw new MelonError("Empty Mango selector", {
			code: MelonErrorCode.QUERY_INVALID,
		});
	}
	const first = nodes[0];
	if (nodes.length === 1 && first) return first;
	return { type: "and", nodes };
}

export interface MangoQueryCompiler {
	readonly source: "mango";
	compile(
		query: MangoQuery,
		collection: string,
		schema: MelonSchema,
	): PreparedQuery;
}

/**
 * Creates a Mango-to-AST query compiler.
 */
export function createMangoCompiler(): MangoQueryCompiler {
	return {
		source: "mango",
		compile(
			query: MangoQuery,
			collection: string,
			schema: MelonSchema,
		): PreparedQuery {
			const normalized = normalizeMangoQuery(query);
			const mode = normalized.mode ?? "many";
			const ast: QueryAst = {
				collection,
				where: compileSelector(normalized.selector),
				orderBy: normalized.sort?.map((s) => {
					const field = Object.keys(s)[0] ?? "";
					const direction = s[field] ?? "asc";
					return { field, direction };
				}),
				skip: normalized.skip,
				limit: mode === "one" ? (normalized.limit ?? 1) : normalized.limit,
				select: normalized.fields ? { fields: normalized.fields } : undefined,
				mode,
			};
			validateQuery(ast, schema);
			const plan = planQuery(ast, schema);
			return { ast, plan, source: "mango" };
		},
	};
}
