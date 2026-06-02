import type { StorageAdapter } from "@melon/db";
import type { SqliteDriver } from "./driver.ts";

const adapterDrivers = new WeakMap<StorageAdapter, SqliteDriver>();

/**
 * @internal Registers the driver for test-only raw SQL access.
 */
export function registerSqliteDriverForTests(
	adapter: StorageAdapter,
	driver: SqliteDriver,
): void {
	adapterDrivers.set(adapter, driver);
}

/**
 * Returns the underlying SqliteDriver for integration tests (raw SQL + flush).
 */
export function getSqliteDriverForTests(
	adapter: StorageAdapter,
): SqliteDriver | undefined {
	return adapterDrivers.get(adapter);
}
