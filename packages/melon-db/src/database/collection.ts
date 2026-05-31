import type { AdapterWriteOperation, StorageAdapter } from "../adapter.ts";
import type { QueryAst } from "../ast.ts";
import {
	emitInsertChange,
	emitWriteChanges,
} from "../change/emit-write-change.ts";
import type { ChangeEmitter } from "../change/emitter.ts";
import type { DevtoolsBridge } from "../devtools.ts";
import { MelonError, MelonErrorCode } from "../errors.ts";
import { prepareQuery } from "../query/prepare.ts";
import type { CollectionMetadata, MelonSchema } from "../schema.ts";
import { createQueryHandle } from "./query-handle.ts";
import type { InsertInput, MelonCollection, UpdateInput } from "./types.ts";

export interface CollectionDeps {
	adapter: StorageAdapter;
	schema: MelonSchema;
	metadata: CollectionMetadata;
	emitter: ChangeEmitter;
	devtools?: DevtoolsBridge;
	isInsideWrite: () => boolean;
	skipSyncOutbox?: () => boolean;
	onSyncWrite?: (operation: AdapterWriteOperation) => Promise<void>;
	ensureReady: () => Promise<void>;
}

/**
 * Creates a MelonCollection backed by the storage adapter.
 */
export function createCollection<RecordShape = Record<string, unknown>>(
	deps: CollectionDeps,
): MelonCollection<RecordShape> {
	const {
		adapter,
		schema,
		metadata,
		emitter,
		devtools,
		isInsideWrite,
		skipSyncOutbox,
		onSyncWrite,
		ensureReady,
	} = deps;
	const name = metadata.name;

	function assertWriteContext(): void {
		if (!isInsideWrite()) {
			throw new MelonError("Writes must run inside db.write()", {
				code: MelonErrorCode.WRITE_OUTSIDE_TRANSACTION,
				remediation: "Wrap mutations in db.write(async (tx) => { ... }).",
			});
		}
	}

	function defaultAst(mode: QueryAst["mode"] = "many"): QueryAst {
		return { collection: name, mode };
	}

	async function notifySyncWrite(op: AdapterWriteOperation): Promise<void> {
		if (skipSyncOutbox?.()) {
			return;
		}
		await onSyncWrite?.(op);
	}

	function toHandle(query?: QueryAst) {
		const ast = query ?? defaultAst();
		const prepared = prepareQuery({ ...ast, collection: name }, schema);
		return createQueryHandle<RecordShape>(
			{ adapter, schema, emitter, devtools, ensureReady },
			prepared,
		);
	}

	return {
		name,

		async findById(id: string | number): Promise<RecordShape | null> {
			const handle = toHandle({
				collection: name,
				mode: "one",
				where: {
					type: "predicate",
					predicate: { field: metadata.primaryKey, op: "eq", value: id },
				},
			});
			return handle.fetchOne();
		},

		async findMany(query?: QueryAst): Promise<RecordShape[]> {
			return toHandle(query).fetch();
		},

		async findFirst(query?: QueryAst): Promise<RecordShape | null> {
			const ast = query ?? defaultAst("one");
			return toHandle({
				...ast,
				collection: name,
				mode: "one",
				limit: 1,
			}).fetchOne();
		},

		async count(query?: QueryAst): Promise<number> {
			const ast = query ?? defaultAst("count");
			return toHandle({ ...ast, collection: name, mode: "count" }).fetchCount();
		},

		query(query?: QueryAst) {
			return toHandle(query);
		},

		async insert(data: InsertInput<RecordShape>): Promise<RecordShape> {
			assertWriteContext();
			const op: AdapterWriteOperation = {
				type: "insert",
				collection: name,
				values: data as Record<string, unknown>,
			};
			devtools?.emitWrite(op);
			await adapter.write(op);
			const pk = metadata.primaryKey;
			const id = (data as Record<string, unknown>)[pk] as
				| string
				| number
				| undefined;
			const inserted = id !== undefined ? await this.findById(id) : null;
			if (!inserted) {
				const rows = await this.findMany();
				const record = rows[rows.length - 1] as RecordShape;
				const resolvedId = (record as Record<string, unknown>)[pk] as
					| string
					| number;
				emitInsertChange(emitter, name, resolvedId);
				await notifySyncWrite({
					type: "insert",
					collection: name,
					values: record as Record<string, unknown>,
				});
				return record;
			}
			emitInsertChange(
				emitter,
				name,
				(inserted as Record<string, unknown>)[pk] as string | number,
			);
			await notifySyncWrite({
				type: "insert",
				collection: name,
				values: inserted as Record<string, unknown>,
			});
			return inserted;
		},

		async update(
			id: string | number,
			data: UpdateInput<RecordShape>,
		): Promise<RecordShape> {
			assertWriteContext();
			const op: AdapterWriteOperation = {
				type: "update",
				collection: name,
				primaryKey: String(id),
				values: data as Record<string, unknown>,
			};
			devtools?.emitWrite(op);
			await adapter.write(op);
			emitWriteChanges(emitter, schema, op);
			await notifySyncWrite(op);
			const record = await this.findById(id);
			if (!record) {
				throw new MelonError(`Record "${id}" not found after update`, {
					code: MelonErrorCode.RECORD_NOT_FOUND,
				});
			}
			return record;
		},

		async delete(id: string | number): Promise<void> {
			assertWriteContext();
			const op: AdapterWriteOperation = {
				type: "delete",
				collection: name,
				primaryKey: String(id),
				id,
			};
			devtools?.emitWrite(op);
			await adapter.write(op);
			emitWriteChanges(emitter, schema, op);
			await notifySyncWrite(op);
		},
	};
}
