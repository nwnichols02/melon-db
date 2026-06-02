export type QueryOperator =
	| "eq"
	| "neq"
	| "gt"
	| "gte"
	| "lt"
	| "lte"
	| "in"
	| "notIn"
	| "like"
	| "contains"
	| "isNull";

export interface QueryPredicate {
	field: string;
	op: QueryOperator;
	value?: unknown;
}

export type QueryBooleanNode =
	| { type: "predicate"; predicate: QueryPredicate }
	| { type: "and"; nodes: QueryBooleanNode[] }
	| { type: "or"; nodes: QueryBooleanNode[] }
	| { type: "not"; node: QueryBooleanNode };

export interface QuerySort {
	field: string;
	direction: "asc" | "desc";
}

export interface QueryRelationInclude {
	relation: string;
	where?: QueryBooleanNode;
	orderBy?: QuerySort[];
	limit?: number;
}

export interface QuerySelect {
	fields?: string[];
	include?: Record<string, QueryRelationInclude>;
}

/** Filters parent rows via a belongsTo relation (Watermelon Q.on parity). */
export interface QueryRelationFilter {
	relation: string;
	where: QueryBooleanNode;
}

export interface QueryAst {
	collection: string;
	where?: QueryBooleanNode;
	orderBy?: QuerySort[];
	skip?: number;
	limit?: number;
	select?: QuerySelect;
	relationFilters?: QueryRelationFilter[];
	mode: "many" | "one" | "count";
}

export interface QueryPlan {
	indexHint?: string[];
	postFilter?: boolean;
	stableSort: QuerySort[];
}

export type PreparedQuerySource = "melon" | "prisma" | "mango" | "compat";

export interface PreparedQuery {
	ast: QueryAst;
	plan: QueryPlan;
	source: PreparedQuerySource;
}

/**
 * Builds a single-field predicate node.
 */
export function predicate(
	field: string,
	op: QueryOperator,
	value?: unknown,
): QueryBooleanNode {
	return { type: "predicate", predicate: { field, op, value } };
}

/**
 * Combines nodes with logical AND.
 */
export function and(...nodes: QueryBooleanNode[]): QueryBooleanNode {
	return { type: "and", nodes };
}

/**
 * Combines nodes with logical OR.
 */
export function or(...nodes: QueryBooleanNode[]): QueryBooleanNode {
	return { type: "or", nodes };
}

/**
 * Negates a boolean node.
 */
export function not(node: QueryBooleanNode): QueryBooleanNode {
	return { type: "not", node };
}

/**
 * Creates a query AST for a collection.
 */
export function queryAst(
	collection: string,
	options: Omit<QueryAst, "collection" | "mode"> & { mode?: QueryAst["mode"] },
): QueryAst {
	return {
		collection,
		where: options.where,
		orderBy: options.orderBy,
		skip: options.skip,
		limit: options.limit,
		select: options.select,
		relationFilters: options.relationFilters,
		mode: options.mode ?? "many",
	};
}
