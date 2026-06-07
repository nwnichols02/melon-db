import type { AdapterWriteOperation, MelonSchema } from "@melon-db/db";
import type { SqliteDriver } from "../driver.ts";
import {
	type InvalidationEvent,
	type RelatedRowLookup,
	shouldInvalidateSubscription,
} from "./invalidation.ts";
import type { QuerySubscriptionRegistry } from "./registry.ts";

export interface WriteInvalidationContext {
	oldRow?: Record<string, unknown> | null;
	newRow?: Record<string, unknown> | null;
}

function quoteTable(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
}

function quoteColumn(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
}

function createRelatedRowLookup(
	driver: SqliteDriver,
	schema: MelonSchema,
): RelatedRowLookup {
	const cache = new Map<string, Record<string, unknown> | null>();

	return async (collection, primaryKey) => {
		const cacheKey = `${collection}:${String(primaryKey)}`;
		if (cache.has(cacheKey)) {
			return cache.get(cacheKey) ?? null;
		}

		const row = await fetchRowByPrimaryKey(
			driver,
			collection,
			schema.getCollection(collection).primaryKey,
			primaryKey,
		);
		cache.set(cacheKey, row);
		return row;
	};
}

async function invalidateSubscriptionsForEvent(
	registry: QuerySubscriptionRegistry,
	schema: MelonSchema,
	event: InvalidationEvent,
	lookupRelatedRow: RelatedRowLookup,
): Promise<void> {
	const subscriptions = registry.getSubscriptionsAffectedByCollection(
		event.collection,
	);

	for (const entry of subscriptions) {
		const shouldInvalidate = await shouldInvalidateSubscription(
			entry,
			event,
			schema,
			lookupRelatedRow,
		);
		if (shouldInvalidate) {
			registry.scheduleNotify(entry.id);
		}
	}
}

/**
 * Invalidates observeQuery subscriptions affected by a write operation.
 */
export async function invalidateForWrite(
	driver: SqliteDriver,
	schema: MelonSchema,
	registry: QuerySubscriptionRegistry,
	operation: AdapterWriteOperation,
	context: WriteInvalidationContext,
): Promise<void> {
	if (operation.type === "batch") {
		return;
	}

	const lookupRelatedRow = createRelatedRowLookup(driver, schema);

	if (operation.type === "insert") {
		await invalidateSubscriptionsForEvent(
			registry,
			schema,
			{
				collection: operation.collection,
				operation: "insert",
				newRow: context.newRow ?? operation.values,
			},
			lookupRelatedRow,
		);
		return;
	}

	if (operation.type === "delete") {
		await invalidateSubscriptionsForEvent(
			registry,
			schema,
			{
				collection: operation.collection,
				operation: "delete",
				oldRow: context.oldRow ?? null,
			},
			lookupRelatedRow,
		);
		return;
	}

	if (operation.type === "update") {
		const meta = schema.getCollection(operation.collection);
		const primaryKey = meta.primaryKey;
		const newRow =
			context.newRow ??
			(context.oldRow
				? {
						...context.oldRow,
						...operation.values,
						[primaryKey]: operation.primaryKey,
					}
				: {
						...operation.values,
						[primaryKey]: operation.primaryKey,
					});

		await invalidateSubscriptionsForEvent(
			registry,
			schema,
			{
				collection: operation.collection,
				operation: "update",
				oldRow: context.oldRow ?? null,
				newRow,
			},
			lookupRelatedRow,
		);
	}
}

/**
 * Fetches a row by primary key before update/delete.
 */
export async function fetchRowByPrimaryKey(
	driver: SqliteDriver,
	collection: string,
	primaryKey: string,
	id: string | number,
): Promise<Record<string, unknown> | null> {
	const table = quoteTable(collection);
	const pkColumn = quoteColumn(primaryKey);
	return driver.queryFirst(`SELECT * FROM ${table} WHERE ${pkColumn} = ?`, [
		id,
	]);
}
