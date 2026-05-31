export const SyncStatusKind = {
	Idle: "idle",
	Pulling: "pulling",
	Pushing: "pushing",
	Complete: "complete",
	Failed: "failed",
} as const;

export type SyncStatusKind =
	(typeof SyncStatusKind)[keyof typeof SyncStatusKind];

export type SyncStatus =
	| { status: typeof SyncStatusKind.Idle }
	| { status: typeof SyncStatusKind.Pulling }
	| { status: typeof SyncStatusKind.Pushing }
	| { status: typeof SyncStatusKind.Complete }
	| {
			status: typeof SyncStatusKind.Failed;
			error: import("./errors.ts").SyncError;
	  };
