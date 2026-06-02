import type { MelonSchema } from "@melon/db";
import {
	collectRelatedFilterFields,
	computeChangedFields,
	updateTouchesObservationFields,
	updateTouchesRelatedFilterFields,
} from "./predicate-fields.ts";
import type { QuerySubscriptionEntry } from "./registry.ts";
import { rowMatchesWhere } from "./row-match.ts";

export type InvalidationOperation = "insert" | "update" | "delete";

export interface InvalidationEvent {
	collection: string;
	operation: InvalidationOperation;
	oldRow?: Record<string, unknown> | null;
	newRow?: Record<string, unknown> | null;
}

export type RelatedRowLookup = (
	collection: string,
	primaryKey: string | number,
) => Promise<Record<string, unknown> | null>;

function relatedRowMatchesAnyFilter(
	entry: QuerySubscriptionEntry,
	row: Record<string, unknown> | null | undefined,
	schema: MelonSchema,
	relatedCollection: string,
): boolean {
	if (!row) {
		return false;
	}

	const ast = entry.prepared.ast;
	if (!ast.relationFilters || ast.relationFilters.length === 0) {
		return false;
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
		if (rowMatchesWhere(relatedCollection, row, relationFilter.where)) {
			return true;
		}
	}

	return false;
}

async function parentRowMatchesSubscription(
	entry: QuerySubscriptionEntry,
	row: Record<string, unknown> | null | undefined,
	schema: MelonSchema,
	lookupRelatedRow: RelatedRowLookup,
): Promise<boolean> {
	if (!row) {
		return false;
	}

	const ast = entry.prepared.ast;

	if (ast.where && !rowMatchesWhere(ast.collection, row, ast.where)) {
		return false;
	}

	if (!ast.relationFilters || ast.relationFilters.length === 0) {
		return true;
	}

	const meta = schema.getCollection(ast.collection);
	for (const relationFilter of ast.relationFilters) {
		const relation = meta.relations[relationFilter.relation];
		if (!relation || relation.kind !== "belongsTo") {
			continue;
		}

		const fk = row[relation.foreignKey] as string | number | null | undefined;
		if (fk === null || fk === undefined) {
			return false;
		}

		const relatedRow = await lookupRelatedRow(relation.target, fk);
		if (
			!relatedRow ||
			!rowMatchesWhere(relation.target, relatedRow, relationFilter.where)
		) {
			return false;
		}
	}

	return true;
}

async function shouldInvalidateSelfCollection(
	entry: QuerySubscriptionEntry,
	event: InvalidationEvent,
	schema: MelonSchema,
	lookupRelatedRow: RelatedRowLookup,
): Promise<boolean> {
	const ast = entry.prepared.ast;

	if (event.operation === "insert") {
		return parentRowMatchesSubscription(
			entry,
			event.newRow ?? null,
			schema,
			lookupRelatedRow,
		);
	}

	if (event.operation === "delete") {
		return parentRowMatchesSubscription(
			entry,
			event.oldRow ?? null,
			schema,
			lookupRelatedRow,
		);
	}

	const oldRow = event.oldRow;
	const newRow = event.newRow;
	if (!oldRow || !newRow) {
		return true;
	}

	const oldMatches = await parentRowMatchesSubscription(
		entry,
		oldRow,
		schema,
		lookupRelatedRow,
	);
	const newMatches = await parentRowMatchesSubscription(
		entry,
		newRow,
		schema,
		lookupRelatedRow,
	);

	if (!oldMatches && !newMatches) {
		return false;
	}

	if (oldMatches !== newMatches) {
		return true;
	}

	return updateTouchesObservationFields(ast, schema, oldRow, newRow);
}

function shouldInvalidateRelatedCollection(
	entry: QuerySubscriptionEntry,
	event: InvalidationEvent,
	schema: MelonSchema,
): boolean {
	const relatedCollection = event.collection;

	if (event.operation === "insert") {
		return relatedRowMatchesAnyFilter(
			entry,
			event.newRow ?? null,
			schema,
			relatedCollection,
		);
	}

	if (event.operation === "delete") {
		return relatedRowMatchesAnyFilter(
			entry,
			event.oldRow ?? null,
			schema,
			relatedCollection,
		);
	}

	const oldRow = event.oldRow;
	const newRow = event.newRow;
	if (!oldRow || !newRow) {
		return true;
	}

	const oldMatches = relatedRowMatchesAnyFilter(
		entry,
		oldRow,
		schema,
		relatedCollection,
	);
	const newMatches = relatedRowMatchesAnyFilter(
		entry,
		newRow,
		schema,
		relatedCollection,
	);

	if (!oldMatches && !newMatches) {
		return false;
	}

	if (oldMatches !== newMatches) {
		return true;
	}

	return updateTouchesRelatedFilterFields(
		entry.prepared.ast,
		schema,
		relatedCollection,
		oldRow,
		newRow,
	);
}

/**
 * Returns whether a write event should invalidate an observeQuery subscription.
 */
export async function shouldInvalidateSubscription(
	entry: QuerySubscriptionEntry,
	event: InvalidationEvent,
	schema: MelonSchema,
	lookupRelatedRow: RelatedRowLookup,
): Promise<boolean> {
	if (event.collection === entry.collection) {
		return shouldInvalidateSelfCollection(
			entry,
			event,
			schema,
			lookupRelatedRow,
		);
	}

	if (entry.relatedCollections.includes(event.collection)) {
		return shouldInvalidateRelatedCollection(entry, event, schema);
	}

	return false;
}

export { computeChangedFields };
