import type { PreparedQuery, QueryAst } from "@melon/db";
import { compileWhere } from "./compile-predicate.ts";

export interface CompiledSql {
	sql: string;
	params: unknown[];
}

function quoteTable(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Compiles a prepared query into parameterized SQLite SQL.
 */
export function compileQuery(prepared: PreparedQuery): CompiledSql {
	const ast: QueryAst = prepared.ast;
	const table = quoteTable(ast.collection);
	const where = compileWhere(ast.where);
	const whereClause = where.sql ? ` WHERE ${where.sql}` : "";
	const params = [...where.params];

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
