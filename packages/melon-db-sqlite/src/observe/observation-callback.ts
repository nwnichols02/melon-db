import type { MelonSchema } from "@melon/db";
import type { SqliteDriver } from "../driver.ts";
import { flushObservationQueue } from "./flush-queue.ts";
import type { QuerySubscriptionRegistry } from "./registry.ts";

type ObservationFlushHost = {
	setObservationFlushCallback(callback: () => void): void;
	removeObservationFlushCallback(): void;
};

function getObservationFlushHost(): ObservationFlushHost | null {
	const jsi = (
		globalThis as typeof globalThis & {
			melonSqliteJsi?: ObservationFlushHost;
		}
	).melonSqliteJsi;
	if (
		jsi == null ||
		typeof jsi.setObservationFlushCallback !== "function" ||
		typeof jsi.removeObservationFlushCallback !== "function"
	) {
		return null;
	}
	return jsi;
}

const registeredDrivers = new WeakMap<
	SqliteDriver,
	{ schema: MelonSchema; registry: QuerySubscriptionRegistry }
>();

/**
 * Registers native JSI update-hook flush for a driver when observeQuery is used.
 */
export function registerNativeObservationFlush(
	driver: SqliteDriver,
	schema: MelonSchema,
	registry: QuerySubscriptionRegistry,
): void {
	const host = getObservationFlushHost();
	if (host == null) {
		return;
	}

	if (registeredDrivers.has(driver)) {
		return;
	}

	registeredDrivers.set(driver, { schema, registry });

	const flush = (): void => {
		const ctx = registeredDrivers.get(driver);
		if (!ctx) {
			return;
		}
		void flushObservationQueue(driver, ctx.schema, ctx.registry);
	};

	host.setObservationFlushCallback(flush);
}

/**
 * Clears native JSI observation callback for a driver.
 */
export function unregisterNativeObservationFlush(driver: SqliteDriver): void {
	registeredDrivers.delete(driver);
	const host = getObservationFlushHost();
	host?.removeObservationFlushCallback();
}
