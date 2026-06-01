import type {
	ApplyRemoteChangesOptions,
	MelonDatabase,
	Migration,
} from "@melon/db";
import {
	type CheckpointStore,
	DEFAULT_RETRY_POLICY,
	type NetworkMonitor,
	type PullArgs,
	type PullResult,
	type PushArgs,
	type RetryPolicy,
	SyncError,
	type SyncStatus,
	SyncStatusKind,
	type SynchronizeResult,
	synchronize,
} from "@melon/sync";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useDatabase } from "./context.tsx";

export interface MelonSyncContextValue {
	pullChanges: (args: PullArgs) => Promise<PullResult>;
	pushChanges: (args: PushArgs) => Promise<void>;
	checkpointStore: CheckpointStore;
	status: SyncStatus;
	lastPulledAt: number | null;
	error: SyncError | null;
	isSyncing: boolean;
	isPaused: boolean;
	retryCount: number;
	sync: (options?: { signal?: AbortSignal }) => Promise<SynchronizeResult>;
	cancel: () => void;
}

const SyncContext = createContext<MelonSyncContextValue | null>(null);

export interface MelonSyncProviderProps {
	pullChanges: (args: PullArgs) => Promise<PullResult>;
	pushChanges: (args: PushArgs) => Promise<void>;
	checkpointStore?: CheckpointStore;
	retryPolicy?: RetryPolicy | false;
	networkMonitor?: NetworkMonitor;
	autoSyncOnReconnect?: boolean;
	conflictPolicy?: ApplyRemoteChangesOptions["conflictPolicy"];
	syncTimestampField?: string;
	mergeRemoteFields?: ApplyRemoteChangesOptions["mergeRemoteFields"];
	mergeProtectedFields?: ApplyRemoteChangesOptions["mergeProtectedFields"];
	migrationSyncPolicy?: "strict" | "lenient";
	migrations?: Migration[];
	children: React.ReactNode;
}

interface SyncProviderInnerProps {
	db: MelonDatabase;
	pullChanges: (args: PullArgs) => Promise<PullResult>;
	pushChanges: (args: PushArgs) => Promise<void>;
	checkpointStore: CheckpointStore;
	retryPolicy: RetryPolicy | false;
	networkMonitor?: NetworkMonitor;
	autoSyncOnReconnect: boolean;
	conflictPolicy?: ApplyRemoteChangesOptions["conflictPolicy"];
	syncTimestampField?: string;
	mergeRemoteFields?: ApplyRemoteChangesOptions["mergeRemoteFields"];
	mergeProtectedFields?: ApplyRemoteChangesOptions["mergeProtectedFields"];
	migrationSyncPolicy?: "strict" | "lenient";
	migrations?: Migration[];
	children: React.ReactNode;
}

function MelonSyncProviderInner({
	db,
	pullChanges,
	pushChanges,
	checkpointStore,
	retryPolicy,
	networkMonitor,
	autoSyncOnReconnect,
	conflictPolicy,
	syncTimestampField,
	mergeRemoteFields,
	mergeProtectedFields,
	migrationSyncPolicy,
	migrations,
	children,
}: SyncProviderInnerProps): React.ReactElement {
	const [status, setStatus] = useState<SyncStatus>({
		status: SyncStatusKind.Idle,
	});
	const [lastPulledAt, setLastPulledAt] = useState<number | null>(null);
	const [error, setError] = useState<SyncError | null>(null);
	const [retryCount, setRetryCount] = useState(0);
	const mountedRef = useRef(true);
	const abortRef = useRef<AbortController | null>(null);
	const syncingRef = useRef(false);

	useEffect(() => {
		mountedRef.current = true;
		let cancelled = false;
		void checkpointStore.getLastPulledAt().then((value: number | null) => {
			if (!cancelled) {
				setLastPulledAt(value);
			}
		});
		return () => {
			mountedRef.current = false;
			cancelled = true;
		};
	}, [checkpointStore]);

	const sync = useCallback(
		async (options?: {
			signal?: AbortSignal;
		}): Promise<SynchronizeResult> => {
			const onSyncEvent = db.devtools?.emitSync?.bind(db.devtools);
			const controller = new AbortController();
			abortRef.current = controller;
			const signal = options?.signal ?? controller.signal;

			try {
				syncingRef.current = true;
				const result = await synchronize({
					db,
					pullChanges,
					pushChanges,
					checkpointStore,
					retryPolicy,
					signal,
					networkMonitor,
					conflictPolicy,
					syncTimestampField,
					mergeRemoteFields,
					mergeProtectedFields,
					migrationSyncPolicy,
					migrations,
					onSyncEvent,
					onStatusChange: (nextStatus) => {
						if (!mountedRef.current) {
							return;
						}
						setStatus(nextStatus);
						if (nextStatus.status === SyncStatusKind.Retrying) {
							setRetryCount(nextStatus.attempt);
						}
						if (nextStatus.status === SyncStatusKind.Failed) {
							setError(nextStatus.error);
						}
						if (nextStatus.status === SyncStatusKind.Complete) {
							setRetryCount(0);
						}
					},
				});

				if (mountedRef.current) {
					setStatus(result.status);
					setLastPulledAt(result.lastPulledAt);
					setError(null);
					setRetryCount(0);
				}
				return result;
			} catch (syncError) {
				if (mountedRef.current && syncError instanceof SyncError) {
					setStatus({ status: SyncStatusKind.Failed, error: syncError });
					setError(syncError);
				}
				throw syncError;
			} finally {
				syncingRef.current = false;
				if (abortRef.current === controller) {
					abortRef.current = null;
				}
			}
		},
		[
			db,
			pullChanges,
			pushChanges,
			checkpointStore,
			retryPolicy,
			networkMonitor,
			conflictPolicy,
			syncTimestampField,
			mergeRemoteFields,
			mergeProtectedFields,
			migrationSyncPolicy,
			migrations,
		],
	);

	const cancel = useCallback((): void => {
		abortRef.current?.abort();
	}, []);

	useEffect(() => {
		if (!autoSyncOnReconnect || !networkMonitor) {
			return;
		}

		let debounce: ReturnType<typeof setTimeout> | undefined;
		return networkMonitor.subscribe((online) => {
			if (!online || syncingRef.current) {
				return;
			}
			clearTimeout(debounce);
			debounce = setTimeout(() => {
				void sync().catch(() => {});
			}, 300);
		});
	}, [autoSyncOnReconnect, networkMonitor, sync]);

	const isSyncing = useMemo(
		() =>
			status.status === SyncStatusKind.Pulling ||
			status.status === SyncStatusKind.Pushing ||
			status.status === SyncStatusKind.Retrying,
		[status.status],
	);

	const isPaused = useMemo(
		() => status.status === SyncStatusKind.Paused,
		[status.status],
	);

	const value = useMemo<MelonSyncContextValue>(
		() => ({
			pullChanges,
			pushChanges,
			checkpointStore,
			status,
			lastPulledAt,
			error,
			isSyncing,
			isPaused,
			retryCount,
			sync,
			cancel,
		}),
		[
			pullChanges,
			pushChanges,
			checkpointStore,
			status,
			lastPulledAt,
			error,
			isSyncing,
			isPaused,
			retryCount,
			sync,
			cancel,
		],
	);

	return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

/**
 * Provides sync backend callbacks and checkpoint store to the React tree.
 */
export function MelonSyncProvider({
	pullChanges,
	pushChanges,
	checkpointStore,
	retryPolicy = DEFAULT_RETRY_POLICY,
	networkMonitor,
	autoSyncOnReconnect = false,
	conflictPolicy,
	syncTimestampField,
	mergeRemoteFields,
	mergeProtectedFields,
	migrationSyncPolicy,
	migrations,
	children,
}: MelonSyncProviderProps): React.ReactElement {
	const db = useDatabase();
	const resolvedCheckpointStore = useMemo(
		() => checkpointStore ?? db.createCheckpointStore(),
		[checkpointStore, db],
	);

	return (
		<MelonSyncProviderInner
			autoSyncOnReconnect={autoSyncOnReconnect}
			checkpointStore={resolvedCheckpointStore}
			conflictPolicy={conflictPolicy}
			db={db}
			mergeProtectedFields={mergeProtectedFields}
			mergeRemoteFields={mergeRemoteFields}
			migrationSyncPolicy={migrationSyncPolicy}
			migrations={migrations}
			networkMonitor={networkMonitor}
			pullChanges={pullChanges}
			pushChanges={pushChanges}
			retryPolicy={retryPolicy}
			syncTimestampField={syncTimestampField}
		>
			{children}
		</MelonSyncProviderInner>
	);
}

/**
 * Returns sync configuration from MelonSyncProvider context.
 */
export function useMelonSyncContext(): MelonSyncContextValue {
	const context = useContext(SyncContext);
	if (!context) {
		throw new Error(
			"useMelonSyncContext must be used within MelonSyncProvider",
		);
	}
	return context;
}
