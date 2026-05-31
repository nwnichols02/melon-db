import type {
	MelonCollection,
	PreparedQuery,
	QueryAst,
	WriteContext,
} from "@melon/db";
import { prepareQuery } from "@melon/db";
import { useCallback, useEffect, useState } from "react";
import { useDatabase } from "./context.tsx";

export interface UseQueryOptions<T> {
	enabled?: boolean;
	select?: (rows: T[]) => unknown;
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
