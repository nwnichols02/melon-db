/** Watermelon-compatible record payload for sync. */
export type SyncRecord = Record<string, unknown>;

/** Watermelon-compatible changes grouped by collection. */
export interface SyncChanges {
	[collection: string]: {
		created: SyncRecord[];
		updated: SyncRecord[];
		deleted: string[];
	};
}

export interface GetLocalChangesOptions {
	collections?: string[];
}

export type RemoteSyncOperation = "created" | "updated" | "deleted";

export interface ConflictResolverContext {
	collection: string;
	recordId: string | number;
	operation: RemoteSyncOperation;
	primaryKey: string;
	local: SyncRecord | null;
	remote: SyncRecord;
	outboxEntry: SyncOutboxEntry | null;
}

export type ConflictResolverResult =
	| { action: "apply"; record: SyncRecord; clearOutbox?: boolean }
	| { action: "skip" };

export type ConflictResolver = (
	ctx: ConflictResolverContext,
) => ConflictResolverResult | Promise<ConflictResolverResult>;

export interface ApplyRemoteChangesOptions {
	/** Default: server-wins — remote record replaces local on id collision. */
	conflictPolicy?:
		| "server-wins"
		| "skip-existing"
		| "client-wins"
		| "last-write-wins"
		| "merge-by-field"
		| "custom";
	/** Required when `conflictPolicy` is `custom`. */
	conflictResolver?: ConflictResolver;
	/** Field used for last-write-wins; defaults to "_updated_at" when present. */
	syncTimestampField?: string;
	/** When set, only these fields are taken from remote when not in pendingFields. */
	mergeRemoteFields?: string[];
	/** Always use remote values for these fields (e.g. server-owned timestamps). */
	mergeProtectedFields?: string[];
}

export interface SyncConfig {
	/** Exclude collections with localOnly: true (default true). */
	respectLocalOnly?: boolean;
}

export const SyncOutboxOperation = {
	Created: "created",
	Updated: "updated",
	Deleted: "deleted",
} as const;

export type SyncOutboxOperation =
	(typeof SyncOutboxOperation)[keyof typeof SyncOutboxOperation];

export interface SyncOutboxEntry {
	id: string;
	collection: string;
	recordId: string | number;
	operation: SyncOutboxOperation;
	timestamp: number;
	/** Field values touched by local updates since last successful push. */
	pendingFields?: Record<string, unknown>;
}

export interface SyncOutboxStore {
	list(): Promise<SyncOutboxEntry[]>;
	findByRecord(
		collection: string,
		recordId: string | number,
	): Promise<SyncOutboxEntry | null>;
	upsert(entry: SyncOutboxEntry): Promise<void>;
	removeByRecord(collection: string, recordId: string | number): Promise<void>;
	clear(collections?: string[]): Promise<void>;
}
