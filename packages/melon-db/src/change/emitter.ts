import type { AdapterChangeSet } from "../adapter.ts";

export interface CollectionChange {
	collection: string;
	created: Array<string | number>;
	updated: Array<string | number>;
	deleted: Array<string | number>;
}

type ChangeListener = (change: CollectionChange) => void;

/**
 * In-process change bus for collection-level notifications.
 */
export class ChangeEmitter {
	private readonly listeners = new Map<string, Set<ChangeListener>>();
	private readonly globalListeners = new Set<ChangeListener>();

	emit(change: CollectionChange): void {
		const collectionListeners = this.listeners.get(change.collection);
		if (collectionListeners) {
			for (const listener of collectionListeners) {
				listener(change);
			}
		}
		for (const listener of this.globalListeners) {
			listener(change);
		}
	}

	subscribe(collection: string, listener: ChangeListener): () => void {
		let set = this.listeners.get(collection);
		if (!set) {
			set = new Set();
			this.listeners.set(collection, set);
		}
		set.add(listener);
		return () => {
			set?.delete(listener);
		};
	}

	subscribeAll(listener: ChangeListener): () => void {
		this.globalListeners.add(listener);
		return () => {
			this.globalListeners.delete(listener);
		};
	}

	toChangeSet(changes: CollectionChange[]): AdapterChangeSet {
		const collections: AdapterChangeSet["collections"] = {};
		for (const change of changes) {
			collections[change.collection] = {
				created: change.created,
				updated: change.updated,
				deleted: change.deleted,
			};
		}
		return { collections };
	}
}
