import type { MelonSchema, QueryBooleanNode } from "@melon/db";
import type { SqliteDriver } from "../driver.ts";
import { fetchRowByPrimaryKey } from "./invalidator.ts";
import type { QuerySubscriptionRegistry } from "./registry.ts";
import { rowMatchesWhere } from "./row-match.ts";
import type { ObservationEvent } from "./triggers.ts";

function rowMatchesSubscription(
	collection: string,
	row: Record<string, unknown> | null | undefined,
	where: QueryBooleanNode | undefined,
): boolean {
	if (!row) {
		return false;
	}
	return rowMatchesWhere(collection, row, where);
}

function scheduleForRow(
	collection: string,
	row: Record<string, unknown> | null | undefined,
	registry: QuerySubscriptionRegistry,
): void {
	const subscriptions = registry.getSubscriptionsForCollection(collection);
	for (const entry of subscriptions) {
		if (rowMatchesSubscription(collection, row, entry.where)) {
			registry.scheduleNotify(entry.id);
		}
	}
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

	for (const event of events) {
		const subscriptions = registry.getSubscriptionsForCollection(
			event.collection,
		);
		if (subscriptions.length === 0) {
			continue;
		}

		const meta = schema.getCollection(event.collection);
		const primaryKey = meta.primaryKey;

		if (event.operation === "delete") {
			for (const entry of subscriptions) {
				registry.scheduleNotify(entry.id);
			}
			continue;
		}

		const row = await fetchRowByPrimaryKey(
			driver,
			event.collection,
			primaryKey,
			event.recordId,
		);
		scheduleForRow(event.collection, row, registry);
	}
}
