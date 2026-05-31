import type { SyncRecord } from "@melon/db";
import type { PullArgs, PullResult, PushArgs, SyncBackend } from "@melon/sync";
import type { SQL } from "bun";
import { SyncServerError, SyncServerErrorCode } from "./errors.ts";
import { runSyncServerMigrations } from "./migrate.ts";
import {
	type CollectionSyncConfig,
	DEFAULT_SYNC_SCHEMA,
	findCollectionConfig,
} from "./schema-config.ts";

export interface PostgresSyncStoreOptions {
	sql: SQL;
	schema?: readonly CollectionSyncConfig[];
	runMigrations?: boolean;
}

interface TaskRow {
	id: string;
	title: string;
	status: string;
	server_created_at: number;
	server_updated_at: number;
}

type SqlQueryClient = <T = unknown>(
	strings: TemplateStringsArray,
	...values: unknown[]
) => Promise<T>;

/**
 * Postgres-backed reference sync store using Bun's native SQL client.
 */
export class PostgresSyncStore implements SyncBackend {
	private readonly sql: SQL;
	private readonly schema: readonly CollectionSyncConfig[];

	constructor(options: PostgresSyncStoreOptions) {
		this.sql = options.sql;
		this.schema = options.schema ?? DEFAULT_SYNC_SCHEMA;
	}

	private assertSupportedCollections(changes: PushArgs["changes"]): void {
		for (const collectionName of Object.keys(changes)) {
			if (!findCollectionConfig(this.schema, collectionName)) {
				throw new SyncServerError(
					`Unsupported collection "${collectionName}"`,
					{ code: SyncServerErrorCode.UNSUPPORTED_COLLECTION },
				);
			}
		}
	}

	private async tick(executor: SqlQueryClient = this.sql): Promise<number> {
		const rows = await executor<{ value: number }[]>`
			UPDATE sync_meta
			SET value = value + 1
			WHERE key = 'clock'
			RETURNING value
		`;
		const value = rows[0]?.value;
		if (value === undefined) {
			throw new SyncServerError("Sync clock missing from sync_meta", {
				code: SyncServerErrorCode.INVALID_PAYLOAD,
				status: 500,
			});
		}
		return Number(value);
	}

	private rowToRecord(config: CollectionSyncConfig, row: TaskRow): SyncRecord {
		const record: SyncRecord = {};
		for (const field of config.fields) {
			record[field] = row[field as keyof TaskRow];
		}
		return record;
	}

	async pullChanges(args: PullArgs): Promise<PullResult> {
		const since = args.lastPulledAt ?? 0;
		const timestamp = await this.tick();
		const changes: PullResult["changes"] = {};

		for (const config of this.schema) {
			const createdRows = await this.sql<TaskRow[]>`
				SELECT id, title, status, server_created_at, server_updated_at
				FROM sync_tasks
				WHERE server_created_at > ${since}
			`;
			const updatedRows = await this.sql<TaskRow[]>`
				SELECT id, title, status, server_created_at, server_updated_at
				FROM sync_tasks
				WHERE server_updated_at > ${since}
					AND server_created_at <= ${since}
			`;
			const deletedRows = await this.sql<{ record_id: string }[]>`
				SELECT record_id
				FROM sync_tombstones
				WHERE collection = ${config.name}
					AND deleted_at > ${since}
			`;

			changes[config.name] = {
				created: createdRows.map((row) => this.rowToRecord(config, row)),
				updated: updatedRows.map((row) => this.rowToRecord(config, row)),
				deleted: deletedRows.map((row) => row.record_id),
			};
		}

		return { changes, timestamp };
	}

	async pushChanges(args: PushArgs): Promise<void> {
		this.assertSupportedCollections(args.changes);

		await this.sql.begin(async (tx) => {
			for (const config of this.schema) {
				const changeSet = args.changes[config.name];
				if (!changeSet) {
					continue;
				}

				for (const record of changeSet.created) {
					const id = String(record[config.primaryKey]);
					const now = await this.tick(tx);
					await tx`
						DELETE FROM sync_tombstones
						WHERE collection = ${config.name}
							AND record_id = ${id}
					`;
					await tx`
						INSERT INTO sync_tasks (id, title, status, server_created_at, server_updated_at)
						VALUES (
							${id},
							${String(record.title ?? "")},
							${String(record.status ?? "")},
							${now},
							${now}
						)
						ON CONFLICT (id) DO UPDATE SET
							title = EXCLUDED.title,
							status = EXCLUDED.status,
							server_updated_at = EXCLUDED.server_updated_at
					`;
				}

				for (const record of changeSet.updated) {
					const id = String(record[config.primaryKey]);
					const now = await this.tick(tx);
					await tx`
						UPDATE sync_tasks
						SET
							title = ${String(record.title ?? "")},
							status = ${String(record.status ?? "")},
							server_updated_at = ${now}
						WHERE id = ${id}
					`;
				}

				for (const id of changeSet.deleted) {
					const deletedAt = await this.tick(tx);
					await tx`
						DELETE FROM sync_tasks
						WHERE id = ${id}
					`;
					await tx`
						INSERT INTO sync_tombstones (collection, record_id, deleted_at)
						VALUES (${config.name}, ${id}, ${deletedAt})
						ON CONFLICT (collection, record_id) DO UPDATE SET
							deleted_at = EXCLUDED.deleted_at
					`;
				}
			}
		});
	}

	/**
	 * Returns a record by primary key for demos and tests.
	 */
	async getRecord(id: string): Promise<SyncRecord | undefined> {
		const rows = await this.sql<TaskRow[]>`
			SELECT id, title, status, server_created_at, server_updated_at
			FROM sync_tasks
			WHERE id = ${id}
		`;
		const row = rows[0];
		if (!row) {
			return undefined;
		}
		const config = findCollectionConfig(this.schema, "tasks");
		if (!config) {
			return undefined;
		}
		return this.rowToRecord(config, row);
	}
}

export interface CreatePostgresSyncStoreOptions {
	schema?: readonly CollectionSyncConfig[];
	runMigrations?: boolean;
}

/**
 * Clears sync server tables for test isolation.
 */
export async function resetPostgresSyncData(sql: SQL): Promise<void> {
	await sql`TRUNCATE sync_tasks, sync_tombstones`;
	await sql`UPDATE sync_meta SET value = 0 WHERE key = 'clock'`;
}

/**
 * Creates a Postgres sync store, running migrations by default.
 */
export async function createPostgresSyncStore(
	connectionString: string,
	options: CreatePostgresSyncStoreOptions = {},
): Promise<PostgresSyncStore> {
	const { SQL } = await import("bun");
	const sql = new SQL(connectionString);

	if (options.runMigrations !== false) {
		await runSyncServerMigrations({ sql });
	}

	return new PostgresSyncStore({
		sql,
		schema: options.schema,
		runMigrations: options.runMigrations,
	});
}
