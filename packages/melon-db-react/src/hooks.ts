import type {
	MelonCollection,
	PreparedQuery,
	QueryAst,
	WriteContext,
} from "@melon-db/db";
import { prepareQuery } from "@melon-db/db";
import { compilePrismaQuery } from "@melon-db/db-prisma";
import type { PrismaFindManyArgs } from "@melon-db/db-prisma";
import { type QueryBuilder, resolveCollectionQuery } from "@melon-db/db-query";
import { createMangoCompiler } from "@melon-db/db-query-mango";
import type { MangoQuery } from "@melon-db/db-query-mango";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDatabase } from "./context.tsx";
import {
	fluentBuilderKey,
	mangoQueryKey,
	prismaArgsKey,
	queryInputKey,
	resolvePreparedQuery,
} from "./query-deps.ts";

const mangoCompiler = createMangoCompiler();

export interface UseQueryOptions<
	T extends Record<string, unknown> = Record<string, unknown>,
	U = T[],
> {
	enabled?: boolean;
	select?: (rows: T[]) => U;
}

function rowsFromAdapter<T extends Record<string, unknown>>(
	value: Record<string, unknown>[],
): T[] {
	return value as T[];
}

export type QueryAsyncState<T> =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "ready"; data: T }
	| { status: "error"; error: Error };

function toError(err: unknown): Error {
	return err instanceof Error ? err : new Error(String(err));
}

function useObserveListState<
	T extends Record<string, unknown>,
	U = T[],
>(
	prepared: PreparedQuery,
	options?: UseQueryOptions<T, U>,
): QueryAsyncState<U> {
	const db = useDatabase();
	const enabled = options?.enabled ?? true;
	const preparedKey = queryInputKey(prepared);
	const [state, setState] = useState<QueryAsyncState<U>>(() =>
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
			const typed = rowsFromAdapter<T>(value);
			const next = options?.select ? options.select(typed) : (typed as U);
			setState({ status: "ready", data: next });
		};

		void handle.fetch().then(
			(rows) => applyRows(rows),
			(err) => {
				if (!cancelled) {
					setState({ status: "error", error: toError(err) });
				}
			},
		);

		const unsub = handle.observe((value) => applyRows(value));

		return () => {
			cancelled = true;
			unsub();
		};
	}, [db, prepared.ast.collection, preparedKey, enabled, options?.select]);

	return state;
}

function useObserveRecordState<T extends Record<string, unknown>>(
	collection: string,
	id: string | number,
	recordKey: string,
	options?: { enabled?: boolean },
): QueryAsyncState<T | null> {
	const db = useDatabase();
	const enabled = options?.enabled ?? true;
	const [state, setState] = useState<QueryAsyncState<T | null>>(() =>
		enabled ? { status: "loading" } : { status: "idle" },
	);

	useEffect(() => {
		if (!enabled || recordKey === "") {
			setState({ status: "idle" });
			return;
		}
		setState({ status: "loading" });
		let cancelled = false;
		const col = db.collection(collection);
		const loadInFlight = { current: false };

		const load = async (): Promise<void> => {
			if (loadInFlight.current) {
				return;
			}
			loadInFlight.current = true;
			try {
				const row = await col.findById(id);
				if (!cancelled) {
					const data: T | null = row === null ? null : (row as T);
					setState({ status: "ready", data });
				}
			} catch (err) {
				if (!cancelled) {
					setState({ status: "error", error: toError(err) });
				}
			} finally {
				loadInFlight.current = false;
			}
		};

		void load();

		const unsub = db.observeCollections([collection], () => {
			void load();
		});

		return () => {
			cancelled = true;
			unsub();
		};
	}, [db, collection, id, recordKey, enabled]);

	return state;
}

/**
 * Reactive query hook backed by MelonQueryHandle.observe.
 */
export function useQuery<
	T extends Record<string, unknown> = Record<string, unknown>,
	U = T[],
>(query: QueryAst | PreparedQuery, options?: UseQueryOptions<T, U>): U {
	const db = useDatabase();
	const enabled = options?.enabled ?? true;
	const [rows, setRows] = useState<U>([] as U);
	const key = queryInputKey(query);
	const prepared = useMemo(
		() => resolvePreparedQuery(query, db.schema),
		[db.schema, key],
	);

	useEffect(() => {
		if (!enabled) return;
		const handle = db.collection(prepared.ast.collection).query(prepared.ast);
		return handle.observe((value) => {
			const typed = rowsFromAdapter<T>(value);
			const next = options?.select ? options.select(typed) : (typed as U);
			setRows(next);
		});
	}, [db, prepared.ast.collection, key, enabled, options?.select]);

	return rows;
}

/**
 * Reactive query hook with loading and error state.
 */
export function useQueryState<
	T extends Record<string, unknown> = Record<string, unknown>,
	U = T[],
>(
	query: QueryAst | PreparedQuery,
	options?: UseQueryOptions<T, U>,
): QueryAsyncState<U> {
	const db = useDatabase();
	const key = queryInputKey(query);
	const prepared = useMemo(
		() => resolvePreparedQuery(query, db.schema),
		[db.schema, key],
	);
	return useObserveListState<T, U>(prepared, options);
}

/**
 * Returns a collection by name from the database context.
 */
export function useCollection<T extends Record<string, unknown> = Record<
	string,
	unknown
>>(name: string): MelonCollection<T> {
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
	const key = queryInputKey(query);
	const prepared = useMemo(
		() => resolvePreparedQuery(query, db.schema),
		[db.schema, key],
	);

	useEffect(() => {
		const handle = db.collection(prepared.ast.collection).query(prepared.ast);
		let cancelled = false;
		const refresh = (): void => {
			void handle.fetchCount().then((value) => {
				if (!cancelled) {
					setCount(value);
				}
			});
		};
		refresh();
		const unsub = handle.observe(refresh);
		return () => {
			cancelled = true;
			unsub();
		};
	}, [db, prepared.ast.collection, key]);

	return count;
}

/**
 * Reactive Prisma-style findMany hook.
 */
export function useFindMany<
	T extends Record<string, unknown> = Record<string, unknown>,
	U = T[],
>(
	collection: string,
	args?: PrismaFindManyArgs,
	options?: UseQueryOptions<T, U>,
): U {
	const db = useDatabase();
	const argsKey = prismaArgsKey(args);
	const prepared = useMemo(
		() => compilePrismaQuery(collection, args, db.schema),
		[db.schema, collection, argsKey],
	);
	return useQuery<T, U>(prepared, options);
}

/**
 * Reactive Prisma-style findMany hook with loading and error state.
 */
export function useFindManyState<
	T extends Record<string, unknown> = Record<string, unknown>,
	U = T[],
>(
	collection: string,
	args?: PrismaFindManyArgs,
	options?: UseQueryOptions<T, U>,
): QueryAsyncState<U> {
	const db = useDatabase();
	const argsKey = prismaArgsKey(args);
	const prepared = useMemo(
		() => compilePrismaQuery(collection, args, db.schema),
		[db.schema, collection, argsKey],
	);
	return useObserveListState<T, U>(prepared, options);
}

/**
 * Reactive Prisma-style findFirst hook.
 */
export function useFindFirst<
	T extends Record<string, unknown> = Record<string, unknown>,
>(
	collection: string,
	args?: PrismaFindManyArgs,
	options?: UseQueryOptions<T, T[]>,
): T | null {
	const db = useDatabase();
	const argsKey = prismaArgsKey(args);
	const prepared = useMemo(
		() => compilePrismaQuery(collection, args, db.schema, "one"),
		[db.schema, collection, argsKey],
	);
	const rows = useQuery<T, T[]>(prepared, options);
	return rows[0] ?? null;
}

/**
 * Reactive hook for a fluent {@link QueryBuilder} callback on a collection.
 */
export function useFluentQuery<
	T extends Record<string, unknown> = Record<string, unknown>,
	U = T[],
>(
	collection: string,
	builder: (q: QueryBuilder<T>) => QueryBuilder<T>,
	options?: UseQueryOptions<T, U>,
): U {
	const db = useDatabase();
	const builderKey = fluentBuilderKey(collection, builder);
	const prepared = useMemo(() => {
		const ast = resolveCollectionQuery<T>(collection, builder);
		return prepareQuery(ast, db.schema);
	}, [db.schema, collection, builderKey]);
	return useQuery<T, U>(prepared, options);
}

/**
 * Reactive fluent builder hook with loading and error state.
 */
export function useFluentQueryState<
	T extends Record<string, unknown> = Record<string, unknown>,
	U = T[],
>(
	collection: string,
	builder: (q: QueryBuilder<T>) => QueryBuilder<T>,
	options?: UseQueryOptions<T, U>,
): QueryAsyncState<U> {
	const db = useDatabase();
	const builderKey = fluentBuilderKey(collection, builder);
	const prepared = useMemo(() => {
		const ast = resolveCollectionQuery<T>(collection, builder);
		return prepareQuery(ast, db.schema);
	}, [db.schema, collection, builderKey]);
	return useObserveListState<T, U>(prepared, options);
}

/**
 * Reactive Mango-style query hook.
 */
export function useMangoQuery<
	T extends Record<string, unknown> = Record<string, unknown>,
	U = T[],
>(
	collection: string,
	query: MangoQuery,
	options?: UseQueryOptions<T, U>,
): U {
	const db = useDatabase();
	const queryKey = mangoQueryKey(query);
	const prepared = useMemo(
		() => mangoCompiler.compile(query, collection, db.schema),
		[db.schema, collection, queryKey],
	);
	return useQuery<T, U>(prepared, options);
}

/**
 * Reactive hook for a single record by primary key.
 */
export function useRecord<T extends Record<string, unknown> = Record<
	string,
	unknown
>>(
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
export function useRecordState<T extends Record<string, unknown> = Record<
	string,
	unknown
>>(
	collection: string,
	id: string | number | null | undefined,
	options?: { enabled?: boolean },
): QueryAsyncState<T | null> {
	const hasId = id !== null && id !== undefined;
	const enabled = (options?.enabled ?? true) && hasId;

	if (!enabled || !hasId) {
		return useObserveRecordState<T>(collection, "", "", { enabled: false });
	}

	return useObserveRecordState<T>(
		collection,
		id,
		`${collection}:${String(id)}`,
		options,
	);
}
