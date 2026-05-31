import type { FieldDefinition, MelonSchema } from "../schema.ts";

export type MigrationStep =
	| { type: "createTable"; collection: string }
	| {
			type: "addColumns";
			collection: string;
			fields: Record<string, FieldDefinition>;
	  }
	| { type: "addIndexes"; collection: string; indexes: string[][] }
	| { type: "sql"; sql: string };

export interface Migration {
	toVersion: number;
	steps: MigrationStep[];
}

export interface MigrationAdapterHooks {
	execSql(sql: string): Promise<void>;
	getMeta(key: string): Promise<string | null>;
	setMeta(key: string, value: string): Promise<void>;
}

export interface MigrationStepExecutor {
	applyStep(step: MigrationStep, schema: MelonSchema): Promise<void>;
}

export const META_TABLE = "_melon_meta";
export const SCHEMA_VERSION_KEY = "schema_version";

export const CREATE_META_TABLE_SQL = `CREATE TABLE IF NOT EXISTS "${META_TABLE}" (key TEXT PRIMARY KEY, value TEXT)`;
