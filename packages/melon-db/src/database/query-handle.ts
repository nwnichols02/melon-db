import type { StorageAdapter } from "../adapter.ts";
import type { PreparedQuery } from "../ast.ts";
import type { ChangeEmitter } from "../change/emitter.ts";
import type { DevtoolsBridge } from "../devtools.ts";
import { observeQuery } from "./observe.ts";
import type { MelonQueryHandle } from "./types.ts";

export interface QueryHandleDeps {
	adapter: StorageAdapter;
	emitter: ChangeEmitter;
	devtools?: DevtoolsBridge;
	ensureReady: () => Promise<void>;
}

/**
 * Query handle that delegates fetch/count to the adapter and supports observation.
 */
export function createQueryHandle<RecordShape = Record<string, unknown>>(
	deps: QueryHandleDeps,
	prepared: PreparedQuery,
): MelonQueryHandle<RecordShape> {
	const { adapter, emitter, devtools, ensureReady } = deps;

	async function fetchRows(): Promise<RecordShape[]> {
		await ensureReady();
		const start = performance.now();
		const result = await adapter.find(prepared);
		const queryDebug = adapter.getLastQueryDebug?.();
		devtools?.emitQuery({
			source: prepared.source,
			input: prepared.ast,
			ast: prepared.ast,
			plan: prepared.plan,
			sql: queryDebug?.sql,
			durationMs: performance.now() - start,
		});
		return result.rows as RecordShape[];
	}

	return {
		prepared,

		async fetch(): Promise<RecordShape[]> {
			return fetchRows();
		},

		async fetchOne(): Promise<RecordShape | null> {
			const rows = await fetchRows();
			return rows[0] ?? null;
		},

		async fetchCount(): Promise<number> {
			if (prepared.ast.mode === "count") {
				const result = await adapter.count(prepared);
				const queryDebug = adapter.getLastQueryDebug?.();
				devtools?.emitQuery({
					source: prepared.source,
					input: prepared.ast,
					ast: prepared.ast,
					plan: prepared.plan,
					sql: queryDebug?.sql,
				});
				return result.count;
			}
			const rows = await fetchRows();
			return rows.length;
		},

		observe(onValue: (rows: RecordShape[]) => void): () => void {
			let cancelled = false;
			devtools?.emitSubscription({
				collection: prepared.ast.collection,
				active: true,
			});

			const notify = (): void => {
				if (cancelled) return;
				void fetchRows().then((rows) => {
					if (!cancelled) onValue(rows);
				});
			};

			notify();
			const unsubscribe = observeQuery(adapter, emitter, prepared, notify);

			return () => {
				cancelled = true;
				unsubscribe();
				devtools?.emitSubscription({
					collection: prepared.ast.collection,
					active: false,
				});
			};
		},
	};
}
