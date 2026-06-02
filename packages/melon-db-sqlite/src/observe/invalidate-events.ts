import type { MelonSchema } from "@melon/db";
import type { SqliteDriver } from "../driver.ts";
import {
	type RelatedRowLookup,
	shouldInvalidateSubscription,
} from "./invalidation.ts";
import { fetchRowByPrimaryKey } from "./invalidator.ts";
import type { QuerySubscriptionRegistry } from "./registry.ts";
import type { ObservationEvent } from "./triggers.ts";

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

/**
 * Invalidates observeQuery subscriptions from SQLite trigger observation events.
 */
export async function invalidateForObservationEvents(
	driver: SqliteDriver,
	schema: MelonSchema,
	registry: QuerySubscriptionRegistry,
	events: ObservationEvent[],
): Promise<void> {
	if (events.length === 0) {
		return;
	}

	const lookupRelatedRow = createRelatedRowLookup(driver, schema);

	for (const event of events) {
		const subscriptions = registry.getSubscriptionsAffectedByCollection(
			event.collection,
		);
		if (subscriptions.length === 0) {
			continue;
		}

		const meta = schema.getCollection(event.collection);
		const primaryKey = meta.primaryKey;

		if (event.operation === "delete") {
			const oldRow = await fetchRowByPrimaryKey(
				driver,
				event.collection,
				primaryKey,
				event.recordId,
			);

			if (!oldRow) {
				for (const entry of subscriptions) {
					registry.scheduleNotify(entry.id);
				}
				continue;
			}

			for (const entry of subscriptions) {
				const shouldInvalidate = await shouldInvalidateSubscription(
					entry,
					{
						collection: event.collection,
						operation: "delete",
						oldRow,
					},
					schema,
					lookupRelatedRow,
				);
				if (shouldInvalidate) {
					registry.scheduleNotify(entry.id);
				}
			}
			continue;
		}

		const row = await fetchRowByPrimaryKey(
			driver,
			event.collection,
			primaryKey,
			event.recordId,
		);

		for (const entry of subscriptions) {
			const shouldInvalidate = await shouldInvalidateSubscription(
				entry,
				{
					collection: event.collection,
					operation: event.operation,
					newRow: row ?? undefined,
				},
				schema,
				lookupRelatedRow,
			);
			if (shouldInvalidate) {
				registry.scheduleNotify(entry.id);
			}
		}
	}
}
