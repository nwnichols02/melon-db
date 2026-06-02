import type { MelonSchema } from "@melon/db";
import type { SqliteDriver } from "../driver.ts";
import { toSqlParams } from "../sql/bindings.ts";

const EVENTS_TABLE = "_melon_observation_events";
const installedCollections = new Set<string>();

function quoteIdent(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
}

function triggerPrefix(collection: string): string {
	return `melon_observe_${collection.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

/**
 * Creates the internal observation events table (idempotent).
 */
export async function ensureObservationMetaTable(
	driver: SqliteDriver,
): Promise<void> {
	await driver.exec(`
CREATE TABLE IF NOT EXISTS ${quoteIdent(EVENTS_TABLE)} (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "collection" TEXT NOT NULL,
  "record_id" TEXT NOT NULL,
  "operation" TEXT NOT NULL
)`);
}

/**
 * Installs AFTER INSERT/UPDATE/DELETE triggers for a collection (idempotent).
 */
export async function ensureCollectionTriggers(
	driver: SqliteDriver,
	collection: string,
	primaryKey: string,
): Promise<void> {
	if (installedCollections.has(collection)) {
		return;
	}

	await ensureObservationMetaTable(driver);

	const table = quoteIdent(collection);
	const pk = quoteIdent(primaryKey);
	const events = quoteIdent(EVENTS_TABLE);
	const prefix = triggerPrefix(collection);

	await driver.exec(`
CREATE TRIGGER IF NOT EXISTS ${quoteIdent(`${prefix}_insert`)}
AFTER INSERT ON ${table}
BEGIN
  INSERT INTO ${events} ("collection", "record_id", "operation")
  VALUES ('${collection.replace(/'/g, "''")}', CAST(NEW.${pk} AS TEXT), 'insert');
END`);

	await driver.exec(`
CREATE TRIGGER IF NOT EXISTS ${quoteIdent(`${prefix}_update`)}
AFTER UPDATE ON ${table}
BEGIN
  INSERT INTO ${events} ("collection", "record_id", "operation")
  VALUES ('${collection.replace(/'/g, "''")}', CAST(NEW.${pk} AS TEXT), 'update');
END`);

	await driver.exec(`
CREATE TRIGGER IF NOT EXISTS ${quoteIdent(`${prefix}_delete`)}
AFTER DELETE ON ${table}
BEGIN
  INSERT INTO ${events} ("collection", "record_id", "operation")
  VALUES ('${collection.replace(/'/g, "''")}', CAST(OLD.${pk} AS TEXT), 'delete');
END`);

	installedCollections.add(collection);
}

/**
 * Ensures meta table and collection triggers when the first subscription is created.
 */
export async function ensureObservationTriggers(
	driver: SqliteDriver,
	schema: MelonSchema,
	collection: string,
): Promise<void> {
	const meta = schema.getCollection(collection);
	await ensureCollectionTriggers(driver, collection, meta.primaryKey);
}

export interface ObservationEvent {
	collection: string;
	recordId: string;
	operation: "insert" | "update" | "delete";
}

/**
 * Reads and clears pending trigger events (used after writes for consistency).
 */
export async function drainObservationEvents(
	driver: SqliteDriver,
): Promise<ObservationEvent[]> {
	await ensureObservationMetaTable(driver);
	const events = quoteIdent(EVENTS_TABLE);
	const rows = await driver.queryAll(
		`SELECT "collection", "record_id", "operation" FROM ${events} ORDER BY "id" ASC`,
		[],
	);
	await driver.exec(`DELETE FROM ${events}`);
	return rows.map((row) => ({
		collection: String(row.collection),
		recordId: String(row.record_id),
		operation: String(row.operation) as ObservationEvent["operation"],
	}));
}

/**
 * Clears trigger install cache (e.g. on adapter close).
 */
export function resetObservationTriggerCache(): void {
	installedCollections.clear();
}
