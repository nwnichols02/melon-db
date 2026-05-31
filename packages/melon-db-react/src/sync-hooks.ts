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
	sync: () => Promise<SynchronizeResult>;
	status: SyncStatus;
	lastPulledAt: number | null;
	isSyncing: boolean;
	error: SyncError | null;
} {
	const { sync, status, lastPulledAt, isSyncing, error } =
		useMelonSyncContext();
	return { sync, status, lastPulledAt, isSyncing, error };
}
