import {
	type MelonSchema,
	type PreparedQuery,
	type QueryAst,
	type QueryBooleanNode,
	type QueryOperator,
	type QueryRelationInclude,
	type QuerySelect,
	planQuery,
	predicate,
	validateQuery,
} from "@melon/db";
import type { PrismaFindManyArgs, PrismaWhereInput } from "./types.ts";

function compileSelect(
	collection: string,
	schema: MelonSchema,
	args: PrismaFindManyArgs | undefined,
): QuerySelect | undefined {
	if (!args?.select && !args?.include) {
		return undefined;
	}

	const select: QuerySelect = {};
	if (args.select) {
		select.fields = Object.entries(args.select)
			.filter(([, enabled]) => enabled)
			.map(([field]) => field);
	}

	if (args.include) {
		const includes: Record<string, QueryRelationInclude> = {};
		const collectionMeta = schema.getCollection(collection);
		for (const [relationName, includeValue] of Object.entries(args.include)) {
			if (!includeValue) {
				continue;
			}
			const relation = collectionMeta.relations[relationName];
			if (!relation || (relation.kind !== "belongsTo" && relation.kind !== "hasMany")) {
				continue;
			}
			const nestedArgs =
				typeof includeValue === "object" ? includeValue : undefined;
			includes[relationName] = {
				relation: relationName,
				where: nestedArgs?.where ? whereToAst(nestedArgs.where) : undefined,
				orderBy: nestedArgs?.orderBy
					? (Array.isArray(nestedArgs.orderBy)
							? nestedArgs.orderBy
							: [nestedArgs.orderBy]
						).flatMap((o) =>
							Object.entries(o).map(([field, direction]) => ({
								field,
								direction: direction ?? ("asc" as const),
							})),
						)
					: undefined,
				limit: nestedArgs?.take,
			};
		}
		if (Object.keys(includes).length > 0) {
			select.include = includes;
		}
	}

	return select.fields?.length || select.include ? select : undefined;
}

function whereToAst(where: PrismaWhereInput): QueryBooleanNode | undefined {
	const nodes: QueryBooleanNode[] = [];

	for (const [field, value] of Object.entries(where)) {
		if (field === "AND" && Array.isArray(value)) {
			const childNodes = value
				.map((w) => whereToAst(w as PrismaWhereInput))
				.filter((n): n is QueryBooleanNode => n !== undefined);
			if (childNodes.length > 0) nodes.push({ type: "and", nodes: childNodes });
			continue;
		}
		if (field === "OR" && Array.isArray(value)) {
			const childNodes = value
				.map((w) => whereToAst(w as PrismaWhereInput))
				.filter((n): n is QueryBooleanNode => n !== undefined);
			if (childNodes.length > 0) nodes.push({ type: "or", nodes: childNodes });
			continue;
		}

		if (typeof value === "object" && value !== null) {
			for (const [op, opValue] of Object.entries(
				value as Record<string, unknown>,
			)) {
				const opMap: Record<string, QueryOperator> = {
					equals: "eq",
					not: "neq",
					gt: "gt",
					gte: "gte",
					lt: "lt",
					lte: "lte",
					in: "in",
					notIn: "notIn",
					contains: "contains",
				};
				const melonOp = opMap[op];
				if (melonOp) {
					nodes.push(predicate(field, melonOp, opValue));
				}
			}
			continue;
		}

		nodes.push(predicate(field, "eq", value));
	}

	if (nodes.length === 0) return undefined;
	if (nodes.length === 1) return nodes[0];
	return { type: "and", nodes };
}

/**
 * Compiles Prisma-style find args into a PreparedQuery.
 */
export function compilePrismaQuery(
	collection: string,
	args: PrismaFindManyArgs | undefined,
	schema: MelonSchema,
	mode: QueryAst["mode"] = "many",
): PreparedQuery {
	const orderBy = args?.orderBy
		? (Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]).flatMap(
				(o) =>
					Object.entries(o).map(([field, direction]) => ({
						field,
						direction: direction ?? ("asc" as const),
					})),
			)
		: undefined;

	const ast: QueryAst = {
		collection,
		where: args?.where ? whereToAst(args.where) : undefined,
		orderBy,
		skip: args?.skip,
		limit: args?.take,
		select: compileSelect(collection, schema, args),
		mode,
	};

	validateQuery(ast, schema);
	return { ast, plan: planQuery(ast, schema), source: "prisma" };
}
