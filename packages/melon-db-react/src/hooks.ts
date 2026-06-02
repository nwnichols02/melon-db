import type {
	MelonCollection,
	PreparedQuery,
	QueryAst,
	WriteContext,
} from "@melon/db";
import { predicate, prepareQuery } from "@melon/db";
import { compilePrismaQuery } from "@melon/db-prisma";
import type { PrismaFindManyArgs } from "@melon/db-prisma";
import { type QueryBuilder, resolveCollectionQuery } from "@melon/db-query";
import { createMangoCompiler } from "@melon/db-query-mango";
import type { MangoQuery } from "@melon/db-query-mango";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDatabase } from "./context.tsx";

const mangoCompiler = createMangoCompiler();

export interface UseQueryOptions<T> {
	enabled?: boolean;
	select?: (rows: T[]) => unknown;
}

export type QueryAsyncState<T> =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "ready"; data: T }
	| { status: "error"; error: Error };

function toError(err: unknown): Error {
	return err instanceof Error ? err : new Error(String(err));
}

function useObserveListState<T>(
	prepared: PreparedQuery,
	options?: UseQueryOptions<T>,
): QueryAsyncState<T[]> {
	const db = useDatabase();
	const enabled = options?.enabled ?? true;
	const [state, setState] = useState<QueryAsyncState<T[]>>(() =>
		enabled ? { status: "loading" } : { status: "idle" },
	);

	useEffect(() => {
		if (!enabled) {
			setState({ status: "idle" });
			return;
		}
		setState({ status: "loading" });
		const handle = db.collection(prepared.ast.collection).query(prepared.ast);
		let cancelled = false;

		const applyRows = (value: Record<string, unknown>[]) => {
			if (cancelled) return;
			const next = options?.select
				? (options.select(value as T[]) as T[])
				: (value as T[]);
			setState({ status: "ready", data: next });
		};

		void handle.fetch().then(
			(rows) => applyRows(rows as Record<string, unknown>[]),
			(err) => {
				if (!cancelled) {
					setState({ status: "error", error: toError(err) });
				}
			},
		);

		const unsub = handle.observe((value) =>
			applyRows(value as Record<string, unknown>[]),
		);

		return () => {
			cancelled = true;
			unsub();
		};
	}, [db, prepared, enabled, options?.select]);

	return state;
}

function useObserveRecordState<T>(
	prepared: PreparedQuery,
	options?: { enabled?: boolean },
): QueryAsyncState<T | null> {
	const db = useDatabase();
	const enabled = options?.enabled ?? true;
	const [state, setState] = useState<QueryAsyncState<T | null>>(() =>
		enabled ? { status: "loading" } : { status: "idle" },
	);

	useEffect(() => {
		if (!enabled) {
			setState({ status: "idle" });
			return;
		}
		setState({ status: "loading" });
		const handle = db.collection(prepared.ast.collection).query(prepared.ast);
		let cancelled = false;

		const applyRecord = (row: Record<string, unknown> | null) => {
			if (cancelled) return;
			setState({ status: "ready", data: row as T | null });
		};

		void handle.fetchOne().then(
			(row) => applyRecord(row as Record<string, unknown> | null),
			(err) => {
				if (!cancelled) {
					setState({ status: "error", error: toError(err) });
				}
			},
		);

		const unsub = handle.observe((rows) =>
			applyRecord((rows[0] as Record<string, unknown>) ?? null),
		);

		return () => {
			cancelled = true;
			unsub();
		};
	}, [db, prepared, enabled]);

	return state;
}

/**
 * Reactive query hook backed by MelonQueryHandle.observe.
 */
export function useQuery<T = Record<string, unknown>>(
	query: QueryAst | PreparedQuery,
	options?: UseQueryOptions<T>,
): T[] {
	const db = useDatabase();
	const enabled = options?.enabled ?? true;
	const [rows, setRows] = useState<T[]>([]);

	useEffect(() => {
		if (!enabled) return;
		const prepared =
			"ast" in query && "plan" in query
				? (query as PreparedQuery)
				: prepareQuery(query as QueryAst, db.schema);
		const handle = db.collection(prepared.ast.collection).query(prepared.ast);
		return handle.observe((value) => {
			const next = options?.select
				? (options.select(value as T[]) as T[])
				: (value as T[]);
			setRows(next);
		});
	}, [db, query, enabled, options?.select]);

	return rows;
}

/**
 * Reactive query hook with loading and error state.
 */
export function useQueryState<T = Record<string, unknown>>(
	query: QueryAst | PreparedQuery,
	options?: UseQueryOptions<T>,
): QueryAsyncState<T[]> {
	const db = useDatabase();
	const prepared = useMemo(
		() =>
			"ast" in query && "plan" in query
				? (query as PreparedQuery)
				: prepareQuery(query as QueryAst, db.schema),
		[db.schema, query],
	);
	return useObserveListState<T>(prepared, options);
}

/**
 * Returns a collection by name from the database context.
 */
export function useCollection<T = Record<string, unknown>>(
	name: string,
): MelonCollection<T> {
	const db = useDatabase();
	return db.collection(name) as MelonCollection<T>;
}

/**
 * Returns a writer function that runs inside db.write.
 */
export function useWriter(): <T>(
	fn: (tx: WriteContext) => Promise<T>,
) => Promise<T> {
	const db = useDatabase();
	return useCallback((fn) => db.write(fn), [db]);
}

/**
 * Reactive count for a prepared query.
 */
export function useQueryCount(query: QueryAst | PreparedQuery): number {
	const db = useDatabase();
	const [count, setCount] = useState(0);

	useEffect(() => {
		const prepared =
			"ast" in query && "plan" in query
				? (query as PreparedQuery)
				: prepareQuery(query as QueryAst, db.schema);
		const handle = db.collection(prepared.ast.collection).query(prepared.ast);
		return handle.observe(() => {
			void handle.fetchCount().then(setCount);
		});
	}, [db, query]);

	return count;
}

/**
 * Reactive Prisma-style findMany hook.
 */
export function useFindMany<T = Record<string, unknown>>(
	collection: string,
	args?: PrismaFindManyArgs,
	options?: UseQueryOptions<T>,
): T[] {
	const db = useDatabase();
	const prepared = useMemo(
		() => compilePrismaQuery(collection, args, db.schema),
		[db.schema, collection, args],
	);
	return useQuery<T>(prepared, options);
}

/**
 * Reactive Prisma-style findMany hook with loading and error state.
 */
export function useFindManyState<T = Record<string, unknown>>(
	collection: string,
	args?: PrismaFindManyArgs,
	options?: UseQueryOptions<T>,
): QueryAsyncState<T[]> {
	const db = useDatabase();
	const prepared = useMemo(
		() => compilePrismaQuery(collection, args, db.schema),
		[db.schema, collection, args],
	);
	return useObserveListState<T>(prepared, options);
}

/**
 * Reactive Prisma-style findFirst hook.
 */
export function useFindFirst<T = Record<string, unknown>>(
	collection: string,
	args?: PrismaFindManyArgs,
	options?: UseQueryOptions<T>,
): T | null {
	const db = useDatabase();
	const prepared = useMemo(
		() => compilePrismaQuery(collection, args, db.schema, "one"),
		[db.schema, collection, args],
	);
	const rows = useQuery<T>(prepared, options);
	return rows[0] ?? null;
}

/**
 * Reactive hook for a fluent {@link QueryBuilder} callback on a collection.
 */
export function useFluentQuery<T = Record<string, unknown>>(
	collection: string,
	builder: (q: QueryBuilder<T>) => QueryBuilder<T>,
	options?: UseQueryOptions<T>,
): T[] {
	const db = useDatabase();
	const prepared = useMemo(() => {
		const ast = resolveCollectionQuery<T>(collection, builder);
		return prepareQuery(ast, db.schema);
	}, [db.schema, collection, builder]);
	return useQuery<T>(prepared, options);
}

/**
 * Reactive fluent builder hook with loading and error state.
 */
export function useFluentQueryState<T = Record<string, unknown>>(
	collection: string,
	builder: (q: QueryBuilder<T>) => QueryBuilder<T>,
	options?: UseQueryOptions<T>,
): QueryAsyncState<T[]> {
	const db = useDatabase();
	const prepared = useMemo(() => {
		const ast = resolveCollectionQuery<T>(collection, builder);
		return prepareQuery(ast, db.schema);
	}, [db.schema, collection, builder]);
	return useObserveListState<T>(prepared, options);
}

/**
 * Reactive Mango-style query hook.
 */
export function useMangoQuery<T = Record<string, unknown>>(
	collection: string,
	query: MangoQuery,
	options?: UseQueryOptions<T>,
): T[] {
	const db = useDatabase();
	const prepared = useMemo(
		() => mangoCompiler.compile(query, collection, db.schema),
		[db.schema, collection, query],
	);
	return useQuery<T>(prepared, options);
}

/**
 * Reactive hook for a single record by primary key.
 */
export function useRecord<T = Record<string, unknown>>(
	collection: string,
	id: string | number | null | undefined,
	options?: { enabled?: boolean },
): T | null {
	const state = useRecordState<T>(collection, id, options);
	if (state.status === "ready") {
		return state.data;
	}
	return null;
}

/**
 * Reactive single-record hook with loading and error state.
 */
export function useRecordState<T = Record<string, unknown>>(
	collection: string,
	id: string | number | null | undefined,
	options?: { enabled?: boolean },
): QueryAsyncState<T | null> {
	const db = useDatabase();
	const enabled = (options?.enabled ?? true) && id !== null && id !== undefined;

	const prepared = useMemo(() => {
		const meta = db.schema.getCollection(collection);
		const ast: QueryAst = {
			collection,
			mode: "one",
			where: predicate(meta.primaryKey, "eq", id ?? ""),
			limit: 1,
		};
		return prepareQuery(ast, db.schema);
	}, [db.schema, collection, id]);

	return useObserveRecordState<T>(prepared, { enabled });
}
