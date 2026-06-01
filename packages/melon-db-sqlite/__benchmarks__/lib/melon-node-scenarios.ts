import type { AdapterWriteOperation } from "@melon/db";
import { type MelonDatabase, createDatabase } from "@melon/db";
import { createNodeSqliteAdapter } from "../../src/node.ts";
import type { BenchResult } from "./bench-runner.ts";
import { measureMs } from "./bench-runner.ts";
import {
	BATCH_CHUNK_SIZE,
	benchSchema,
	countQuery,
	filteredQuery,
	taskRow,
} from "./fixtures.ts";

function createNodeAdapter() {
	return createNodeSqliteAdapter({ filename: ":memory:" });
}

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
 * Runs Melon scenarios via createNodeSqliteAdapter (better-sqlite3).
 */
export async function runMelonNodeScenarios(
	scale: number,
): Promise<BenchResult[]> {
	const results: BenchResult[] = [];

	{
		const db = createDatabase({
			schema: benchSchema,
			adapter: createNodeAdapter(),
		});
		const durationMs = await measureMs(() => seedRowInsert(db, scale));
		results.push({
			engine: "melon-node",
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
			engine: "melon-node",
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
			engine: "melon-node",
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
			engine: "melon-node",
			scale,
			scenario: "find-by-id",
			durationMs: findByIdMs,
		});

		await db.adapter.close();
	}

	if (scale <= 50_000) {
		const db = createDatabase({
			schema: benchSchema,
			adapter: createNodeAdapter(),
		});
		const durationMs = await measureMs(() => seedBatchInsert(db, scale));
		results.push({
			engine: "melon-node",
			scale,
			scenario: "batch-insert",
			durationMs,
			rowCount: scale,
		});
		await db.adapter.close();
	}

	return results;
}
