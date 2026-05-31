import type { StorageAdapter } from "../adapter.ts";
import type { PreparedQuery } from "../ast.ts";
import type { ChangeEmitter } from "../change/emitter.ts";

/**
 * Subscribes to query result changes via adapter or collection change fallback.
 */
export function observeQuery(
	adapter: StorageAdapter,
	emitter: ChangeEmitter,
	prepared: PreparedQuery,
	onChange: () => void,
): () => void {
	if (adapter.observeQuery) {
		return adapter.observeQuery(prepared, onChange);
	}

	const collection = prepared.ast.collection;
	return emitter.subscribe(collection, () => {
		onChange();
	});
}
