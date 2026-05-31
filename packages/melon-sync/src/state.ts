export const SyncStatusKind = {
	Idle: "idle",
	Pulling: "pulling",
	Pushing: "pushing",
	Retrying: "retrying",
	Paused: "paused",
	Complete: "complete",
	Failed: "failed",
} as const;

export type SyncStatusKind =
	(typeof SyncStatusKind)[keyof typeof SyncStatusKind];

export type SyncStatus =
	| { status: typeof SyncStatusKind.Idle }
	| { status: typeof SyncStatusKind.Pulling }
	| { status: typeof SyncStatusKind.Pushing }
	| {
			status: typeof SyncStatusKind.Retrying;
			phase: "pull" | "push";
			attempt: number;
	  }
	| { status: typeof SyncStatusKind.Paused; reason: "offline" }
	| { status: typeof SyncStatusKind.Complete }
	| {
			status: typeof SyncStatusKind.Failed;
			error: import("./errors.ts").SyncError;
	  };
