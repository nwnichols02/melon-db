import type { MelonSchema } from "@melon/db";
import type { SqliteDriver } from "../driver.ts";
import { invalidateForObservationEvents } from "./invalidate-events.ts";
import type { QuerySubscriptionRegistry } from "./registry.ts";
import { drainObservationEvents } from "./triggers.ts";

/**
 * Drains trigger events and invalidates matching observeQuery subscriptions.
 */
export async function flushObservationQueue(
	driver: SqliteDriver,
	schema: MelonSchema,
	registry: QuerySubscriptionRegistry,
): Promise<void> {
	const events = await drainObservationEvents(driver);
	if (events.length === 0) {
		return;
	}
	await invalidateForObservationEvents(driver, schema, registry, events);
}
