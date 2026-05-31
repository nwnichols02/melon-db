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
