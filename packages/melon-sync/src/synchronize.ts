import type { MelonDatabase, SyncChanges, SyncDebugSnapshot } from "@melon/db";
import { MelonErrorCode, SyncDebugPhase } from "@melon/db";
import type { CheckpointStore } from "./checkpoint.ts";
import { createMemoryCheckpointStore } from "./checkpoint.ts";
import { SyncError, SyncErrorCode } from "./errors.ts";
import type { PullArgs, PullResult, PushArgs } from "./protocol.ts";
import type { SyncStatus } from "./state.ts";
import { SyncStatusKind } from "./state.ts";

export interface SynchronizeArgs {
	db: MelonDatabase;
	pullChanges: (args: PullArgs) => Promise<PullResult>;
	pushChanges: (args: PushArgs) => Promise<void>;
	checkpointStore?: CheckpointStore;
	onStatusChange?: (status: SyncStatus) => void;
	onSyncEvent?: (snapshot: SyncDebugSnapshot) => void;
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
		const lastPulledAt = await checkpointStore.getLastPulledAt();
		const syncStart = performance.now();

		emit({ status: SyncStatusKind.Pulling });
		emitSync({
			phase: SyncDebugPhase.Pull,
			lastPulledAt,
		});

		let pullResult: PullResult;
		try {
			pullResult = await pullChanges({
				lastPulledAt,
				schemaVersion: db.schema.version,
			});
		} catch (error) {
			throw wrapError("Pull failed", SyncErrorCode.SYNC_PULL_FAILED, error);
		}

		emitSync({
			phase: SyncDebugPhase.Apply,
			lastPulledAt,
			changesSummary: summarizeChanges(pullResult.changes),
		});

		try {
			await db.applyRemoteChanges(pullResult.changes);
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
			try {
				await pushChanges({
					changes: localChanges,
					lastPulledAt: pullResult.timestamp,
				});
			} catch (error) {
				throw wrapError("Push failed", SyncErrorCode.SYNC_PUSH_FAILED, error);
			}
			await db.markLocalChangesPushed();
		}

		await checkpointStore.setLastPulledAt(pullResult.timestamp);

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
