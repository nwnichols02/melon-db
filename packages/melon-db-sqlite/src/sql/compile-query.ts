import type { MelonSchema, PreparedQuery, QueryAst } from "@melon/db";
import { compileWhere } from "./compile-predicate.ts";

export interface CompiledSql {
	sql: string;
	params: unknown[];
}

function quoteTable(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
}

function quoteColumn(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
}

function compileRelationFilters(
	ast: QueryAst,
	schema: MelonSchema,
	params: unknown[],
): string[] {
	if (!ast.relationFilters || ast.relationFilters.length === 0) {
		return [];
	}

	const meta = schema.getCollection(ast.collection);
	const parts: string[] = [];

	for (const relationFilter of ast.relationFilters) {
		const relation = meta.relations[relationFilter.relation];
		if (!relation || relation.kind !== "belongsTo") {
			continue;
		}

		const fkColumn = quoteColumn(relation.foreignKey);
		const targetTable = quoteTable(relation.target);
		const targetMeta = schema.getCollection(relation.target);
		const pkColumn = quoteColumn(targetMeta.primaryKey);
		const relatedWhere = compileWhere(relationFilter.where);
		const subWhere = relatedWhere.sql ? ` WHERE ${relatedWhere.sql}` : "";
		params.push(...relatedWhere.params);
		parts.push(
			`${fkColumn} IN (SELECT ${pkColumn} FROM ${targetTable}${subWhere})`,
		);
	}

	return parts;
}

/**
 * Compiles a prepared query into parameterized SQLite SQL.
 */
export function compileQuery(
	prepared: PreparedQuery,
	schema?: MelonSchema,
): CompiledSql {
	const ast: QueryAst = prepared.ast;
	const table = quoteTable(ast.collection);
	const where = compileWhere(ast.where);
	const params = [...where.params];
	const relationParts = schema ? compileRelationFilters(ast, schema, params) : [];
	const whereParts = [where.sql, ...relationParts].filter(
		(part): part is string => part.length > 0,
	);
	const whereClause =
		whereParts.length > 0 ? ` WHERE ${whereParts.join(" AND ")}` : "";

	if (ast.mode === "count") {
		return {
			sql: `SELECT COUNT(*) as count FROM ${table}${whereClause}`,
			params,
		};
	}

	const orderClause =
		ast.orderBy && ast.orderBy.length > 0
			? ` ORDER BY ${ast.orderBy.map((s) => `"${s.field}" ${s.direction.toUpperCase()}`).join(", ")}`
			: "";

	let limitClause = "";
	if (ast.limit !== undefined) {
		limitClause += " LIMIT ?";
		params.push(ast.limit);
	}
	if (ast.skip !== undefined) {
		limitClause += " OFFSET ?";
		params.push(ast.skip);
	}

	if (ast.mode === "one") {
		return {
			sql: `SELECT * FROM ${table}${whereClause}${orderClause} LIMIT 1`,
			params,
		};
	}

	return {
		sql: `SELECT * FROM ${table}${whereClause}${orderClause}${limitClause}`,
		params,
	};
}
