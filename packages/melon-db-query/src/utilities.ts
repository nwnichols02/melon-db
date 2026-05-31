import { type QueryAst, predicate, queryAst } from "@melon/db";

/**
 * Builds a query AST that finds a record by primary key.
 */
export function byId<RecordShape = Record<string, unknown>>(
	collection: string,
	id: string | number,
	primaryKey: keyof RecordShape & string = "id" as keyof RecordShape & string,
): QueryAst {
	return queryAst(collection, {
		mode: "one",
		where: predicate(primaryKey, "eq", id),
	});
}

/**
 * Builds a query AST that filters by a foreign key field.
 */
export function byForeignKey<RecordShape = Record<string, unknown>>(
	collection: string,
	field: keyof RecordShape & string,
	value: unknown,
): QueryAst {
	return queryAst(collection, {
		where: predicate(field, "eq", value),
	});
}
