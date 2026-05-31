/**
 * Describes a collection backed by a Postgres table in the reference sync server.
 */
export interface CollectionSyncConfig {
	readonly name: string;
	readonly table: string;
	readonly primaryKey: string;
	readonly fields: readonly string[];
}

export const DEFAULT_SYNC_SCHEMA: readonly CollectionSyncConfig[] = [
	{
		name: "tasks",
		table: "sync_tasks",
		primaryKey: "id",
		fields: ["id", "title", "status"],
	},
] as const;

/**
 * Finds collection config by collection name.
 */
export function findCollectionConfig(
	schema: readonly CollectionSyncConfig[],
	name: string,
): CollectionSyncConfig | undefined {
	return schema.find((config) => config.name === name);
}
