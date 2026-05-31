import type { SyncError, SyncStatus, SynchronizeResult } from "@melon/sync";
import { useMelonSyncContext } from "./sync-context.tsx";

/**
 * Returns the current sync status from the nearest MelonSyncProvider.
 */
export function useSyncStatus(): SyncStatus {
	return useMelonSyncContext().status;
}

/**
 * Runs sync against the configured backend and exposes reactive status.
 */
export function useSync(): {
	sync: (options?: { signal?: AbortSignal }) => Promise<SynchronizeResult>;
	cancel: () => void;
	status: SyncStatus;
	lastPulledAt: number | null;
	isSyncing: boolean;
	isPaused: boolean;
	retryCount: number;
	error: SyncError | null;
} {
	const {
		sync,
		cancel,
		status,
		lastPulledAt,
		isSyncing,
		isPaused,
		retryCount,
		error,
	} = useMelonSyncContext();
	return {
		sync,
		cancel,
		status,
		lastPulledAt,
		isSyncing,
		isPaused,
		retryCount,
		error,
	};
}
