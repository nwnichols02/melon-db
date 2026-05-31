import type { SyncChanges, SyncRecord } from "@melon/db";
import type {
	PullArgs,
	PullResult,
	PushArgs,
	SyncBackend,
} from "../src/protocol.ts";

interface StoredRecord {
	record: SyncRecord;
	createdAt: number;
	updatedAt: number;
}

interface Tombstone {
	deletedAt: number;
}

/**
 * In-memory mock sync server for integration tests.
 */
export class MockSyncServer implements SyncBackend {
	private records = new Map<string, StoredRecord>();
	private tombstones = new Map<string, Tombstone>();
	private clock = 1;

	constructor(
		private readonly collection = "tasks",
		private readonly primaryKey = "id",
	) {}

	private tick(): number {
		this.clock += 1;
		return this.clock;
	}

	async pullChanges(args: PullArgs): Promise<PullResult> {
		const since = args.lastPulledAt ?? 0;
		const timestamp = this.tick();
		const created: SyncRecord[] = [];
		const updated: SyncRecord[] = [];
		const deleted: string[] = [];

		for (const [id, stored] of this.records) {
			if (stored.updatedAt <= since) {
				continue;
			}
			if (stored.createdAt > since) {
				created.push(stored.record);
			} else {
				updated.push(stored.record);
			}
		}

		for (const [id, tombstone] of this.tombstones) {
			if (tombstone.deletedAt > since) {
				deleted.push(id);
			}
		}

		return {
			changes: {
				[this.collection]: { created, updated, deleted },
			},
			timestamp,
		};
	}

	async pushChanges(args: PushArgs): Promise<void> {
		const changeSet = args.changes[this.collection];
		if (!changeSet) {
			return;
		}

		for (const record of changeSet.created) {
			const id = String(record[this.primaryKey]);
			const now = this.tick();
			this.tombstones.delete(id);
			this.records.set(id, {
				record: { ...record },
				createdAt: now,
				updatedAt: now,
			});
		}

		for (const record of changeSet.updated) {
			const id = String(record[this.primaryKey]);
			const existing = this.records.get(id);
			const now = this.tick();
			this.records.set(id, {
				record: { ...record },
				createdAt: existing?.createdAt ?? now,
				updatedAt: now,
			});
		}

		for (const id of changeSet.deleted) {
			this.records.delete(id);
			this.tombstones.set(id, { deletedAt: this.tick() });
		}
	}

	getRecord(id: string): SyncRecord | undefined {
		return this.records.get(id)?.record;
	}
}
