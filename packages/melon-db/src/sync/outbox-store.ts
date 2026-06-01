import type { SyncOutboxEntry, SyncOutboxStore } from "./types.ts";

/**
 * Creates a globally unique outbox row id (stable across adapter re-open / JS reload).
 */
function nextEntryId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Creates an in-memory sync outbox store for tests and in-memory adapters.
 */
export function createMemorySyncOutboxStore(): SyncOutboxStore {
	const entries = new Map<string, SyncOutboxEntry>();
	const byRecord = new Map<string, string>();

	function recordKey(collection: string, recordId: string | number): string {
		return `${collection}:${String(recordId)}`;
	}

	return {
		async list(): Promise<SyncOutboxEntry[]> {
			return [...entries.values()];
		},

		async findByRecord(
			collection: string,
			recordId: string | number,
		): Promise<SyncOutboxEntry | null> {
			const existingId = byRecord.get(recordKey(collection, recordId));
			if (!existingId) {
				return null;
			}
			return entries.get(existingId) ?? null;
		},

		async upsert(entry: SyncOutboxEntry): Promise<void> {
			const key = recordKey(entry.collection, entry.recordId);
			const existingId = byRecord.get(key);
			if (existingId) {
				entries.delete(existingId);
			}
			for (const [recKey, id] of byRecord.entries()) {
				if (id === entry.id && recKey !== key) {
					byRecord.delete(recKey);
				}
			}
			entries.delete(entry.id);
			entries.set(entry.id, entry);
			byRecord.set(key, entry.id);
		},

		async removeByRecord(
			collection: string,
			recordId: string | number,
		): Promise<void> {
			const key = recordKey(collection, recordId);
			const existingId = byRecord.get(key);
			if (existingId) {
				entries.delete(existingId);
				byRecord.delete(key);
			}
		},

		async clear(collections?: string[]): Promise<void> {
			if (!collections) {
				entries.clear();
				byRecord.clear();
				return;
			}
			const set = new Set(collections);
			for (const entry of entries.values()) {
				if (set.has(entry.collection)) {
					entries.delete(entry.id);
					byRecord.delete(recordKey(entry.collection, entry.recordId));
				}
			}
		},
	};
}

/**
 * Creates a new outbox entry id.
 */
export function createOutboxEntryId(): string {
	return nextEntryId();
}
