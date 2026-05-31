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

export interface ApplyRemoteChangesOptions {
	/** Default: server-wins — remote record replaces local on id collision. */
	conflictPolicy?: "server-wins" | "skip-existing";
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
