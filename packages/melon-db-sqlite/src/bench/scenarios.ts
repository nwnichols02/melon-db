import type { AdapterWriteOperation } from "@melon/db";
import {
	type MelonDatabase,
	type StorageAdapter,
	createDatabase,
} from "@melon/db";
import {
	BATCH_CHUNK_SIZE,
	benchSchema,
	countQuery,
	filteredQuery,
	taskRow,
} from "./fixtures.ts";
import { measureMs } from "./measure.ts";
import type { BenchResult } from "./types.ts";

async function seedRowInsert(
	db: MelonDatabase,
	rowCount: number,
): Promise<void> {
	await db.write(async (tx) => {
		const tasks = tx.collection("tasks");
		for (let i = 0; i < rowCount; i++) {
			await tasks.insert(taskRow(i));
		}
	});
}

async function seedBatchInsert(
	db: MelonDatabase,
	rowCount: number,
): Promise<void> {
	await db.write(async (tx) => {
		for (let offset = 0; offset < rowCount; offset += BATCH_CHUNK_SIZE) {
			const operations: AdapterWriteOperation[] = [];
			const end = Math.min(offset + BATCH_CHUNK_SIZE, rowCount);
			for (let i = offset; i < end; i++) {
				operations.push({
					type: "insert",
					collection: "tasks",
					values: taskRow(i),
				});
			}
			await tx.batch(operations);
		}
	});
}

/**
 * Runs all benchmark scenarios for one adapter factory and scale.
 * Uses a fresh adapter instance per scenario group (matches Node harness).
 */
export async function runScenariosForAdapter(
	createAdapter: () => StorageAdapter | Promise<StorageAdapter>,
	scale: number,
	engineLabel: string,
): Promise<BenchResult[]> {
	const results: BenchResult[] = [];

	{
		const db = createDatabase({
			schema: benchSchema,
			adapter: await Promise.resolve(createAdapter()),
		});
		await db.adapter.initialize(benchSchema);

		const durationMs = await measureMs(() => seedRowInsert(db, scale));
		results.push({
			engine: engineLabel,
			scale,
			scenario: "row-insert",
			durationMs,
			rowCount: scale,
		});

		const queryMs = await measureMs(async () => {
			const rows = await db.collection("tasks").findMany(filteredQuery);
			if (rows.length === 0) {
				throw new Error("expected filtered rows");
			}
		});
		results.push({
			engine: engineLabel,
			scale,
			scenario: "filtered-query",
			durationMs: queryMs,
			resultCount: 20,
		});

		const countMs = await measureMs(async () => {
			const count = await db.collection("tasks").count(countQuery);
			if (count === 0) {
				throw new Error("expected count > 0");
			}
		});
		results.push({
			engine: engineLabel,
			scale,
			scenario: "count-query",
			durationMs: countMs,
		});

		const findByIdMs = await measureMs(async () => {
			const row = await db.collection("tasks").findById("task_0");
			if (!row) {
				throw new Error("expected task_0");
			}
		});
		results.push({
			engine: engineLabel,
			scale,
			scenario: "find-by-id",
			durationMs: findByIdMs,
		});

		await db.adapter.close();
	}

	if (scale <= 50_000) {
		const db = createDatabase({
			schema: benchSchema,
			adapter: await Promise.resolve(createAdapter()),
		});
		await db.adapter.initialize(benchSchema);
		const durationMs = await measureMs(() => seedBatchInsert(db, scale));
		results.push({
			engine: engineLabel,
			scale,
			scenario: "batch-insert",
			durationMs,
			rowCount: scale,
		});
		await db.adapter.close();
	}

	return results;
}
