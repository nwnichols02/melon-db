import type { QueryAst, QueryBooleanNode, QueryOperator } from "../ast.ts";
import { MelonError, MelonErrorCode } from "../errors.ts";
import type { MelonSchema } from "../schema.ts";

const SUPPORTED_OPERATORS: ReadonlySet<QueryOperator> = new Set([
	"eq",
	"neq",
	"gt",
	"gte",
	"lt",
	"lte",
	"in",
	"notIn",
	"like",
	"contains",
	"isNull",
]);

function validateBooleanNode(
	node: QueryBooleanNode,
	schema: MelonSchema,
	collection: string,
): void {
	switch (node.type) {
		case "predicate": {
			const meta = schema.getCollection(collection);
			const fieldNames = new Set([
				meta.primaryKey,
				...Object.keys(meta.fields),
			]);
			if (!fieldNames.has(node.predicate.field)) {
				throw new MelonError(
					`Unknown field "${node.predicate.field}" on collection "${collection}"`,
					{
						code: MelonErrorCode.QUERY_INVALID,
					},
				);
			}
			if (!SUPPORTED_OPERATORS.has(node.predicate.op)) {
				throw new MelonError(`Unsupported operator "${node.predicate.op}"`, {
					code: MelonErrorCode.QUERY_INVALID,
				});
			}
			return;
		}
		case "and":
			for (const child of node.nodes) {
				validateBooleanNode(child, schema, collection);
			}
			return;
		case "or":
			for (const child of node.nodes) {
				validateBooleanNode(child, schema, collection);
			}
			return;
		case "not":
			validateBooleanNode(node.node, schema, collection);
			return;
	}
}

/**
 * Validates a query AST against schema metadata.
 */
export function validateQuery(ast: QueryAst, schema: MelonSchema): void {
	if (!schema.collections[ast.collection]) {
		throw new MelonError(`Unknown collection "${ast.collection}"`, {
			code: MelonErrorCode.QUERY_INVALID,
		});
	}

	if (ast.where) {
		validateBooleanNode(ast.where, schema, ast.collection);
	}

	if (ast.select?.include && Object.keys(ast.select.include).length > 0) {
		const meta = schema.getCollection(ast.collection);
		for (const [relationName] of Object.entries(ast.select.include)) {
			const relation = meta.relations[relationName];
			if (!relation) {
				throw new MelonError(
					`Unknown relation "${relationName}" on collection "${ast.collection}"`,
					{ code: MelonErrorCode.QUERY_INVALID },
				);
			}
			if (relation.kind !== "belongsTo") {
				throw new MelonError(
					`Relation include "${relationName}" is not supported in v1 (belongsTo only)`,
					{
						code: MelonErrorCode.QUERY_INVALID,
						remediation:
							"Use belongsTo relations only, or fetch hasMany relations separately.",
					},
				);
			}
		}
	}

	if (ast.skip !== undefined && ast.skip < 0) {
		throw new MelonError("skip must be non-negative", {
			code: MelonErrorCode.QUERY_INVALID,
		});
	}

	if (ast.limit !== undefined && ast.limit < 0) {
		throw new MelonError("limit must be non-negative", {
			code: MelonErrorCode.QUERY_INVALID,
		});
	}
}
