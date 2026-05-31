import type { AdapterRecord } from "../../adapter.ts";
import type { MelonSchema } from "../../schema.ts";

export type CollectionStore = Map<string | number, AdapterRecord>;

export type InMemoryData = Map<string, CollectionStore>;

/**
 * Creates empty in-memory stores for each collection in the schema.
 */
export function createEmptyStore(schema: MelonSchema): InMemoryData {
	const data: InMemoryData = new Map();
	for (const name of Object.keys(schema.collections)) {
		data.set(name, new Map());
	}
	return data;
}
