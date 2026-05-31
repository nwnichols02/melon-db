import type {
	AdapterChangeSet,
	AdapterWriteOperation,
	StorageAdapter,
} from "../adapter.ts";
import type { PreparedQuery, QueryAst } from "../ast.ts";
import type { DevtoolsBridge } from "../devtools.ts";
import type { MelonSchema } from "../schema.ts";

export type InsertInput<T> = Partial<T>;
export type UpdateInput<T> = Partial<T>;

export interface MelonQueryHandle<RecordShape = Record<string, unknown>> {
	readonly prepared: PreparedQuery;
	fetch(): Promise<RecordShape[]>;
	fetchOne(): Promise<RecordShape | null>;
	fetchCount(): Promise<number>;
	observe(onValue: (rows: RecordShape[]) => void): () => void;
}

export interface MelonCollection<RecordShape = Record<string, unknown>> {
	readonly name: string;
	findById(id: string | number): Promise<RecordShape | null>;
	findMany(query?: QueryAst): Promise<RecordShape[]>;
	findFirst(query?: QueryAst): Promise<RecordShape | null>;
	count(query?: QueryAst): Promise<number>;
	query(query?: QueryAst): MelonQueryHandle<RecordShape>;
	insert(data: InsertInput<RecordShape>): Promise<RecordShape>;
	update(
		id: string | number,
		data: UpdateInput<RecordShape>,
	): Promise<RecordShape>;
	delete(id: string | number): Promise<void>;
}

export interface ReadContext<Schema extends MelonSchema = MelonSchema> {
	collection<Name extends keyof Schema["collections"] & string>(
		name: Name,
	): MelonCollection<CollectionRecord>;
}

export interface WriteContext<Schema extends MelonSchema = MelonSchema>
	extends ReadContext<Schema> {
	batch(operations: AdapterWriteOperation[]): Promise<void>;
}

/** Runtime record shape for collection rows. */
export type CollectionRecord = Record<string, unknown>;

export interface MelonDatabase<Schema extends MelonSchema = MelonSchema> {
	readonly schema: Schema;
	readonly adapter: StorageAdapter;
	collection<Name extends keyof Schema["collections"] & string>(
		name: Name,
	): MelonCollection<CollectionRecord>;
	read<T>(fn: (tx: ReadContext<Schema>) => Promise<T>): Promise<T>;
	write<T>(fn: (tx: WriteContext<Schema>) => Promise<T>): Promise<T>;
	observeCollections(
		names: string[],
		onChange: (changes: AdapterChangeSet) => void,
	): () => void;
	unsafeReset(): Promise<void>;
}

export interface CreateDatabaseOptions<
	Schema extends MelonSchema = MelonSchema,
> {
	schema: Schema;
	adapter: StorageAdapter;
	devtools?: DevtoolsBridge;
}
