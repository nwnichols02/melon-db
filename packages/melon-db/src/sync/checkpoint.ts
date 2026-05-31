/** Meta key for persisted sync checkpoint in `_melon_meta`. */
export const SYNC_LAST_PULLED_AT_KEY = "sync_last_pulled_at";

/**
 * Key-value meta storage backed by adapter `_melon_meta` table.
 */
export interface MetaStore {
	getMeta(key: string): Promise<string | null>;
	setMeta(key: string, value: string): Promise<void>;
}

/**
 * Persists the last successful pull timestamp for incremental sync.
 */
export interface CheckpointStore {
	getLastPulledAt(): Promise<number | null>;
	setLastPulledAt(timestamp: number): Promise<void>;
}

/**
 * Creates an in-memory checkpoint store for tests and headless usage.
 */
export function createMemoryCheckpointStore(): CheckpointStore {
	let lastPulledAt: number | null = null;

	return {
		async getLastPulledAt(): Promise<number | null> {
			return lastPulledAt;
		},
		async setLastPulledAt(timestamp: number): Promise<void> {
			lastPulledAt = timestamp;
		},
	};
}

/**
 * Creates a checkpoint store backed by adapter meta storage.
 */
export function createMetaCheckpointStore(meta: MetaStore): CheckpointStore {
	return {
		async getLastPulledAt(): Promise<number | null> {
			const raw = await meta.getMeta(SYNC_LAST_PULLED_AT_KEY);
			if (raw === null) {
				return null;
			}
			const parsed = Number(raw);
			return Number.isFinite(parsed) ? parsed : null;
		},
		async setLastPulledAt(timestamp: number): Promise<void> {
			await meta.setMeta(SYNC_LAST_PULLED_AT_KEY, String(timestamp));
		},
	};
}
