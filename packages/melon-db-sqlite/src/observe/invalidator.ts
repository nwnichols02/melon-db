import type { AdapterWriteOperation, MelonSchema } from "@melon/db";
import type { SqliteDriver } from "../driver.ts";
import type { QuerySubscriptionRegistry } from "./registry.ts";
import { rowMatchesWhere } from "./row-match.ts";

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

function rowMatchesSubscription(
	collection: string,
	row: Record<string, unknown> | null | undefined,
	where: import("@melon/db").QueryBooleanNode | undefined,
): boolean {
	if (!row) return false;
	return rowMatchesWhere(collection, row, where);
}

/**
 * Invalidates observeQuery subscriptions affected by a write operation.
 */
export async function invalidateForWrite(
	_driver: SqliteDriver,
	schema: MelonSchema,
	registry: QuerySubscriptionRegistry,
	operation: AdapterWriteOperation,
	context: WriteInvalidationContext,
): Promise<void> {
	if (operation.type === "batch") {
		return;
	}

	const collection = operation.collection;
	const subscriptions = registry.getSubscriptionsForCollection(collection);
	if (subscriptions.length === 0) {
		return;
	}

	for (const entry of subscriptions) {
		if (operation.type === "insert") {
			const newRow = context.newRow ?? operation.values;
			if (
				rowMatchesSubscription(
					collection,
					newRow as Record<string, unknown>,
					entry.where,
				)
			) {
				registry.scheduleNotify(entry.id);
			}
			continue;
		}

		if (operation.type === "delete") {
			if (rowMatchesSubscription(collection, context.oldRow, entry.where)) {
				registry.scheduleNotify(entry.id);
			}
			continue;
		}

		if (operation.type === "update") {
			const meta = schema.getCollection(collection);
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

			const oldMatches = rowMatchesSubscription(
				collection,
				context.oldRow,
				entry.where,
			);
			const newMatches = rowMatchesSubscription(
				collection,
				newRow,
				entry.where,
			);
			if (oldMatches || newMatches) {
				registry.scheduleNotify(entry.id);
			}
		}
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
