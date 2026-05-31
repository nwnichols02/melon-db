import type { MelonDatabase, SyncChanges } from "@melon/db";
import { MelonErrorCode } from "@melon/db";
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
	} = args;

	const emit = (status: SyncStatus): void => {
		onStatusChange?.(status);
	};

	emit({ status: SyncStatusKind.Idle });

	try {
		const lastPulledAt = await checkpointStore.getLastPulledAt();

		emit({ status: SyncStatusKind.Pulling });
		let pullResult: PullResult;
		try {
			pullResult = await pullChanges({
				lastPulledAt,
				schemaVersion: db.schema.version,
			});
		} catch (error) {
			throw wrapError("Pull failed", SyncErrorCode.SYNC_PULL_FAILED, error);
		}

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

		const complete: SyncStatus = { status: SyncStatusKind.Complete };
		emit(complete);
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
		throw syncError;
	}
}
