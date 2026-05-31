import type { AdapterWriteOperation } from "../adapter.ts";
import type { MelonSchema } from "../schema.ts";
import type { ChangeEmitter, CollectionChange } from "./emitter.ts";

/**
 * Builds a collection change payload from a single adapter write operation.
 */
export function changeFromWriteOperation(
	operation: AdapterWriteOperation,
): CollectionChange | null {
	if (operation.type === "batch") {
		return null;
	}

	if (operation.type === "insert") {
		const values = operation.values;
		const id = values.id ?? values._id;
		if (id === undefined || id === null) {
			return null;
		}
		return {
			collection: operation.collection,
			created: [id as string | number],
			updated: [],
			deleted: [],
		};
	}

	if (operation.type === "update") {
		return {
			collection: operation.collection,
			created: [],
			updated: [operation.primaryKey],
			deleted: [],
		};
	}

	if (operation.type === "delete") {
		return {
			collection: operation.collection,
			created: [],
			updated: [],
			deleted: [operation.id],
		};
	}

	return null;
}

/**
 * Emits collection change notifications for adapter write operations.
 */
export function emitWriteChanges(
	emitter: ChangeEmitter,
	schema: MelonSchema,
	operation: AdapterWriteOperation,
): void {
	if (operation.type === "batch") {
		for (const child of operation.operations) {
			emitWriteChanges(emitter, schema, child);
		}
		return;
	}

	const meta = schema.getCollection(operation.collection);
	const change =
		operation.type === "insert"
			? ((): CollectionChange | null => {
					const id = operation.values[meta.primaryKey] as
						| string
						| number
						| undefined;
					if (id === undefined) {
						return null;
					}
					return {
						collection: operation.collection,
						created: [id],
						updated: [],
						deleted: [],
					};
				})()
			: changeFromWriteOperation(operation);

	if (change) {
		emitter.emit(change);
	}
}

/**
 * Emits a collection change for a resolved record id after insert.
 */
export function emitInsertChange(
	emitter: ChangeEmitter,
	collection: string,
	id: string | number,
): void {
	emitter.emit({
		collection,
		created: [id],
		updated: [],
		deleted: [],
	});
}
