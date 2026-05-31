import type { MelonDatabase } from "@melon/db";
import {
	type CheckpointStore,
	type PullArgs,
	type PullResult,
	type PushArgs,
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
	sync: () => Promise<SynchronizeResult>;
}

const SyncContext = createContext<MelonSyncContextValue | null>(null);

export interface MelonSyncProviderProps {
	pullChanges: (args: PullArgs) => Promise<PullResult>;
	pushChanges: (args: PushArgs) => Promise<void>;
	checkpointStore?: CheckpointStore;
	children: React.ReactNode;
}

interface SyncProviderInnerProps {
	db: MelonDatabase;
	pullChanges: (args: PullArgs) => Promise<PullResult>;
	pushChanges: (args: PushArgs) => Promise<void>;
	checkpointStore: CheckpointStore;
	children: React.ReactNode;
}

function MelonSyncProviderInner({
	db,
	pullChanges,
	pushChanges,
	checkpointStore,
	children,
}: SyncProviderInnerProps): React.ReactElement {
	const [status, setStatus] = useState<SyncStatus>({
		status: SyncStatusKind.Idle,
	});
	const [lastPulledAt, setLastPulledAt] = useState<number | null>(null);
	const [error, setError] = useState<SyncError | null>(null);
	const mountedRef = useRef(true);

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

	const sync = useCallback(async (): Promise<SynchronizeResult> => {
		const onSyncEvent = db.devtools?.emitSync?.bind(db.devtools);

		try {
			const result = await synchronize({
				db,
				pullChanges,
				pushChanges,
				checkpointStore,
				onSyncEvent,
				onStatusChange: (nextStatus) => {
					if (!mountedRef.current) {
						return;
					}
					setStatus(nextStatus);
					if (nextStatus.status === SyncStatusKind.Failed) {
						setError(nextStatus.error);
					}
				},
			});

			if (mountedRef.current) {
				setStatus(result.status);
				setLastPulledAt(result.lastPulledAt);
				setError(null);
			}
			return result;
		} catch (syncError) {
			if (mountedRef.current && syncError instanceof SyncError) {
				setStatus({ status: SyncStatusKind.Failed, error: syncError });
				setError(syncError);
			}
			throw syncError;
		}
	}, [db, pullChanges, pushChanges, checkpointStore]);

	const isSyncing = useMemo(
		() =>
			status.status === SyncStatusKind.Pulling ||
			status.status === SyncStatusKind.Pushing,
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
			sync,
		}),
		[
			pullChanges,
			pushChanges,
			checkpointStore,
			status,
			lastPulledAt,
			error,
			isSyncing,
			sync,
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
	children,
}: MelonSyncProviderProps): React.ReactElement {
	const db = useDatabase();
	const resolvedCheckpointStore = useMemo(
		() => checkpointStore ?? db.createCheckpointStore(),
		[checkpointStore, db],
	);

	return (
		<MelonSyncProviderInner
			checkpointStore={resolvedCheckpointStore}
			db={db}
			pullChanges={pullChanges}
			pushChanges={pushChanges}
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
