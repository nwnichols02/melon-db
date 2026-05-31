import type { PreparedQuery } from "./ast.ts";
import type { Migration } from "./migrations/types.ts";
import type { MelonSchema } from "./schema.ts";

export interface InitializeOptions {
	migrations?: Migration[];
}

export type AdapterRecord = Record<string, unknown>;

export interface AdapterFindResult {
	rows: AdapterRecord[];
}

export interface AdapterCountResult {
	count: number;
}

export type AdapterWriteOperation =
	| { type: "insert"; collection: string; values: AdapterRecord }
	| {
			type: "update";
			collection: string;
			primaryKey: string;
			values: AdapterRecord;
	  }
	| {
			type: "delete";
			collection: string;
			primaryKey: string;
			id: string | number;
	  }
	| { type: "batch"; operations: AdapterWriteOperation[] };

export interface AdapterChangeSet {
	collections: Record<
		string,
		{
			created: Array<string | number>;
			updated: Array<string | number>;
			deleted: Array<string | number>;
		}
	>;
}

export interface QueryExecutionDebug {
	sql?: string;
	params?: unknown[];
}

export interface StorageAdapterCapabilities {
	transactions: boolean;
	reactiveSubscriptions: boolean;
	jsonFields: boolean;
	joins: boolean;
	partialSelect: boolean;
}

export interface StorageAdapter {
	readonly name: string;
	readonly capabilities: StorageAdapterCapabilities;

	initialize(schema: MelonSchema, options?: InitializeOptions): Promise<void>;
	prepare?(query: PreparedQuery): Promise<PreparedQuery>;
	find(query: PreparedQuery): Promise<AdapterFindResult>;
	count(query: PreparedQuery): Promise<AdapterCountResult>;
	write(operation: AdapterWriteOperation): Promise<void>;
	transaction<T>(fn: () => Promise<T>): Promise<T>;
	getChangedCollections?(sinceVersion: number): Promise<AdapterChangeSet>;
	observeQuery?(query: PreparedQuery, onChange: () => void): () => void;
	getLastQueryDebug?(): QueryExecutionDebug | undefined;
	close(): Promise<void>;
}
