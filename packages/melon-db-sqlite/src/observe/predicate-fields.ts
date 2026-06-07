import type { QueryAst, QueryBooleanNode } from "@melon-db/db";
import type { MelonSchema } from "@melon-db/db";

function collectFieldsFromBooleanNode(
	node: QueryBooleanNode,
	fields: Set<string>,
): void {
	switch (node.type) {
		case "predicate":
			fields.add(node.predicate.field);
			return;
		case "and":
		case "or":
			for (const child of node.nodes) {
				collectFieldsFromBooleanNode(child, fields);
			}
			return;
		case "not":
			collectFieldsFromBooleanNode(node.node, fields);
			return;
	}
}

/**
 * Fields on the parent collection that can affect observeQuery membership.
 */
export function collectObservationFields(
	ast: QueryAst,
	schema: MelonSchema,
): Set<string> {
	const fields = new Set<string>();

	if (ast.where) {
		collectFieldsFromBooleanNode(ast.where, fields);
	}

	if (ast.orderBy) {
		for (const sort of ast.orderBy) {
			fields.add(sort.field);
		}
	}

	if (ast.relationFilters && ast.relationFilters.length > 0) {
		const meta = schema.getCollection(ast.collection);
		for (const relationFilter of ast.relationFilters) {
			const relation = meta.relations[relationFilter.relation];
			if (relation?.kind === "belongsTo") {
				fields.add(relation.foreignKey);
			}
		}
	}

	return fields;
}

/**
 * Fields on a related collection referenced by relationFilters targeting it.
 */
export function collectRelatedFilterFields(
	ast: QueryAst,
	schema: MelonSchema,
	relatedCollection: string,
): Set<string> {
	const fields = new Set<string>();
	if (!ast.relationFilters || ast.relationFilters.length === 0) {
		return fields;
	}

	const meta = schema.getCollection(ast.collection);
	for (const relationFilter of ast.relationFilters) {
		const relation = meta.relations[relationFilter.relation];
		if (
			!relation ||
			relation.kind !== "belongsTo" ||
			relation.target !== relatedCollection
		) {
			continue;
		}
		collectFieldsFromBooleanNode(relationFilter.where, fields);
	}

	return fields;
}

/**
 * Returns field names whose values differ between two rows.
 */
export function computeChangedFields(
	oldRow: Record<string, unknown> | null | undefined,
	newRow: Record<string, unknown> | null | undefined,
): Set<string> {
	const changed = new Set<string>();
	if (!oldRow || !newRow) {
		return changed;
	}

	const keys = new Set([...Object.keys(oldRow), ...Object.keys(newRow)]);
	for (const key of keys) {
		if (oldRow[key] !== newRow[key]) {
			changed.add(key);
		}
	}
	return changed;
}

function setsIntersect(a: Set<string>, b: Set<string>): boolean {
	for (const value of a) {
		if (b.has(value)) {
			return true;
		}
	}
	return false;
}

/**
 * Whether an update changed fields relevant to observation on the parent row.
 */
export function updateTouchesObservationFields(
	ast: QueryAst,
	schema: MelonSchema,
	oldRow: Record<string, unknown>,
	newRow: Record<string, unknown>,
): boolean {
	const changed = computeChangedFields(oldRow, newRow);
	const observationFields = collectObservationFields(ast, schema);
	return setsIntersect(changed, observationFields);
}

/**
 * Whether an update on a related row touches relationFilter predicate fields.
 */
export function updateTouchesRelatedFilterFields(
	ast: QueryAst,
	schema: MelonSchema,
	relatedCollection: string,
	oldRow: Record<string, unknown>,
	newRow: Record<string, unknown>,
): boolean {
	const changed = computeChangedFields(oldRow, newRow);
	const filterFields = collectRelatedFilterFields(
		ast,
		schema,
		relatedCollection,
	);
	return setsIntersect(changed, filterFields);
}
