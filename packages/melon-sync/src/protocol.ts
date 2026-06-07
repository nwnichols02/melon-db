import type { SyncChanges } from "@melon-db/db";

export interface PullMigration {
	from: number;
	tables: string[];
	columns: Array<{ table: string; columns: string[] }>;
}

export interface PullArgs {
	lastPulledAt: number | null;
	schemaVersion: number;
	migration?: PullMigration;
}

export interface PullResult {
	changes: SyncChanges;
	timestamp: number;
	schemaVersion?: number;
}

export interface PushArgs {
	changes: SyncChanges;
	lastPulledAt: number;
}

export interface SyncBackend {
	pullChanges(args: PullArgs): Promise<PullResult>;
	pushChanges(args: PushArgs): Promise<void>;
}
