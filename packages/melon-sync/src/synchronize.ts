import type {
	ApplyRemoteChangesOptions,
	MelonDatabase,
	Migration,
	SyncChanges,
	SyncDebugSnapshot,
} from "@melon/db";
import { MelonErrorCode, SyncDebugPhase } from "@melon/db";
import type { CheckpointStore } from "./checkpoint.ts";
import { createMemoryCheckpointStore } from "./checkpoint.ts";
import { SyncError, SyncErrorCode } from "./errors.ts";
import { buildPullMigration } from "./migration-sync.ts";
import type { NetworkMonitor } from "./network.ts";
import { createAlwaysOnlineMonitor } from "./network.ts";
import type { PullArgs, PullResult, PushArgs } from "./protocol.ts";
import { DEFAULT_RETRY_POLICY, type RetryPolicy, withRetry } from "./retry.ts";
import type { SyncStatus } from "./state.ts";
import { SyncStatusKind } from "./state.ts";

export interface SynchronizeArgs {
	db: MelonDatabase;
	pullChanges: (args: PullArgs) => Promise<PullResult>;
	pushChanges: (args: PushArgs) => Promise<void>;
	checkpointStore?: CheckpointStore;
	onStatusChange?: (status: SyncStatus) => void;
	onSyncEvent?: (snapshot: SyncDebugSnapshot) => void;
	retryPolicy?: RetryPolicy | false;
	signal?: AbortSignal;
	networkMonitor?: NetworkMonitor;
	conflictPolicy?: ApplyRemoteChangesOptions["conflictPolicy"];
	syncTimestampField?: string;
	mergeRemoteFields?: ApplyRemoteChangesOptions["mergeRemoteFields"];
	mergeProtectedFields?: ApplyRemoteChangesOptions["mergeProtectedFields"];
	migrationSyncPolicy?: "strict" | "lenient";
	migrations?: Migration[];
}

export interface SynchronizeResult {
	status: SyncStatus;
	lastPulledAt: number | null;
}

function hasChanges(changes: SyncChanges): boolean {
	for (const changeSet of Object.values(changes)) {
		if (
			changeSet.created.length > 0 ||
			changeSet.updated.length > 0 ||
			changeSet.deleted.length > 0
		) {
			return true;
		}
	}
	return false;
}

function summarizeChanges(
	changes: SyncChanges,
): SyncDebugSnapshot["changesSummary"] {
	const summary: NonNullable<SyncDebugSnapshot["changesSummary"]> = {};
	for (const [collection, changeSet] of Object.entries(changes)) {
		summary[collection] = {
			created: changeSet.created.length,
			updated: changeSet.updated.length,
			deleted: changeSet.deleted.length,
		};
	}
	return summary;
}

function wrapError(
	message: string,
	code: SyncErrorCode,
	cause: unknown,
	retryable = true,
): SyncError {
	return new SyncError(message, {
		code,
		retryable,
		cause,
	});
}

async function assertOnline(
	monitor: NetworkMonitor,
	emit: (status: SyncStatus) => void,
): Promise<void> {
	const online = await monitor.isOnline();
	if (online) {
		return;
	}
	emit({ status: SyncStatusKind.Paused, reason: "offline" });
	throw new SyncError("Device is offline", {
		code: SyncErrorCode.SYNC_OFFLINE,
		retryable: true,
		remediation: "Wait for network connectivity before syncing.",
	});
}

/**
 * Runs a full Watermelon-style sync: pull remote changes, apply locally, push local changes, update checkpoint.
 */
export async function synchronize(
	args: SynchronizeArgs,
): Promise<SynchronizeResult> {
	const {
		db,
		pullChanges,
		pushChanges,
		checkpointStore = createMemoryCheckpointStore(),
		onStatusChange,
		onSyncEvent,
		retryPolicy = DEFAULT_RETRY_POLICY,
		signal,
		networkMonitor = createAlwaysOnlineMonitor(),
		conflictPolicy,
		syncTimestampField,
		mergeRemoteFields,
		mergeProtectedFields,
		migrationSyncPolicy = "strict",
		migrations = [],
	} = args;

	const emit = (status: SyncStatus): void => {
		onStatusChange?.(status);
	};

	const emitSync = (
		snapshot: Omit<SyncDebugSnapshot, "timestamp"> & { timestamp?: number },
	): void => {
		onSyncEvent?.({
			...snapshot,
			timestamp: snapshot.timestamp ?? Date.now(),
		});
	};

	emit({ status: SyncStatusKind.Idle });

	try {
		await assertOnline(networkMonitor, emit);

		const lastPulledAt = await checkpointStore.getLastPulledAt();
		const lastSchemaVersion =
			(await checkpointStore.getLastSchemaVersion?.()) ?? null;
		const syncStart = performance.now();

		const pullMigration =
			lastSchemaVersion !== null &&
			lastSchemaVersion < db.schema.version &&
			migrations.length > 0
				? buildPullMigration(migrations, lastSchemaVersion, db.schema.version)
				: undefined;

		emit({ status: SyncStatusKind.Pulling });
		emitSync({
			phase: SyncDebugPhase.Pull,
			lastPulledAt,
		});

		const runPull = async (): Promise<PullResult> => {
			try {
				return await pullChanges({
					lastPulledAt,
					schemaVersion: db.schema.version,
					migration: pullMigration,
				});
			} catch (error) {
				throw wrapError("Pull failed", SyncErrorCode.SYNC_PULL_FAILED, error);
			}
		};

		let pullResult: PullResult;
		if (retryPolicy === false) {
			pullResult = await runPull();
		} else {
			pullResult = await withRetry(runPull, retryPolicy, {
				signal,
				onRetry: (attempt, error) => {
					emit({
						status: SyncStatusKind.Retrying,
						phase: "pull",
						attempt,
					});
					emitSync({
						phase: SyncDebugPhase.Pull,
						lastPulledAt,
						retryPhase: "pull",
						attempt,
						error: {
							message: error instanceof Error ? error.message : "Pull retry",
							retryable: true,
						},
					});
				},
			});
		}

		if (
			pullResult.schemaVersion !== undefined &&
			pullResult.schemaVersion < db.schema.version &&
			migrationSyncPolicy === "strict"
		) {
			throw new SyncError(
				`Server schema version ${pullResult.schemaVersion} is behind client ${db.schema.version}`,
				{
					code: SyncErrorCode.SYNC_SCHEMA_MISMATCH,
					retryable: false,
					remediation:
						"Upgrade the sync backend before syncing with a newer app version.",
				},
			);
		}

		if (
			pullResult.schemaVersion !== undefined &&
			pullResult.schemaVersion < db.schema.version &&
			migrationSyncPolicy === "lenient"
		) {
			emitSync({
				phase: SyncDebugPhase.Apply,
				lastPulledAt,
				error: {
					code: SyncErrorCode.SYNC_SCHEMA_MISMATCH,
					message: `Server schema ${pullResult.schemaVersion} behind client ${db.schema.version}`,
					retryable: false,
				},
			});
		}

		emitSync({
			phase: SyncDebugPhase.Apply,
			lastPulledAt,
			changesSummary: summarizeChanges(pullResult.changes),
		});

		try {
			await db.applyRemoteChanges(pullResult.changes, {
				conflictPolicy,
				syncTimestampField,
				mergeRemoteFields,
				mergeProtectedFields,
			});
		} catch (error) {
			if (
				error instanceof Error &&
				"code" in error &&
				error.code === MelonErrorCode.SYNC_NOT_ENABLED
			) {
				throw wrapError(
					"Database sync is not enabled",
					SyncErrorCode.SYNC_NOT_ENABLED,
					error,
					false,
				);
			}
			throw wrapError(
				"Failed to apply remote changes",
				SyncErrorCode.SYNC_APPLY_FAILED,
				error,
			);
		}

		const localChanges = await db.getLocalChanges();

		emit({ status: SyncStatusKind.Pushing });
		emitSync({
			phase: SyncDebugPhase.Push,
			lastPulledAt,
			changesSummary: summarizeChanges(localChanges),
		});

		if (hasChanges(localChanges)) {
			const runPush = async (): Promise<void> => {
				try {
					await pushChanges({
						changes: localChanges,
						lastPulledAt: pullResult.timestamp,
					});
				} catch (error) {
					throw wrapError("Push failed", SyncErrorCode.SYNC_PUSH_FAILED, error);
				}
			};

			if (retryPolicy === false) {
				await runPush();
			} else {
				await withRetry(runPush, retryPolicy, {
					signal,
					onRetry: (attempt, error) => {
						emit({
							status: SyncStatusKind.Retrying,
							phase: "push",
							attempt,
						});
						emitSync({
							phase: SyncDebugPhase.Push,
							lastPulledAt,
							retryPhase: "push",
							attempt,
							error: {
								message: error instanceof Error ? error.message : "Push retry",
								retryable: true,
							},
						});
					},
				});
			}
			await db.markLocalChangesPushed();
		}

		await checkpointStore.setLastPulledAt(pullResult.timestamp);
		await checkpointStore.setLastSchemaVersion?.(db.schema.version);

		emitSync({
			phase: SyncDebugPhase.Checkpoint,
			lastPulledAt: pullResult.timestamp,
		});

		const complete: SyncStatus = { status: SyncStatusKind.Complete };
		emit(complete);
		emitSync({
			phase: SyncDebugPhase.Complete,
			lastPulledAt: pullResult.timestamp,
			durationMs: performance.now() - syncStart,
		});

		return {
			status: complete,
			lastPulledAt: pullResult.timestamp,
		};
	} catch (error) {
		const syncError =
			error instanceof SyncError
				? error
				: wrapError("Sync failed", SyncErrorCode.SYNC_PULL_FAILED, error);
		const failed: SyncStatus = {
			status: SyncStatusKind.Failed,
			error: syncError,
		};
		emit(failed);
		emitSync({
			phase: SyncDebugPhase.Failed,
			lastPulledAt: null,
			error: {
				code: syncError.code,
				message: syncError.message,
				retryable: syncError.retryable,
			},
		});
		throw syncError;
	}
}
