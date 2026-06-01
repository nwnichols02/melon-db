import { Q } from "@nozbe/watermelondb";
import type { Database as WdbDatabase } from "@nozbe/watermelondb";
import type { BenchResult } from "./bench-runner.ts";
import { measureMs } from "./bench-runner.ts";
import { BATCH_CHUNK_SIZE, taskRow } from "./fixtures.ts";
import { type Task, closeWdbDatabase, createWdbDatabase } from "./wdb-setup.ts";

async function seedRowInsert(
	database: WdbDatabase,
	rowCount: number,
): Promise<void> {
	await database.write(async () => {
		const tasks = database.get<Task>("tasks");
		for (let i = 0; i < rowCount; i++) {
			const row = taskRow(i);
			await tasks.create((record) => {
				record._raw.id = String(row.id);
				record._raw.status = String(row.status);
				record._raw.priority = Number(row.priority);
			});
		}
	});
}

async function seedBatchInsert(
	database: WdbDatabase,
	rowCount: number,
): Promise<void> {
	await database.write(async () => {
		const tasks = database.get<Task>("tasks");
		for (let offset = 0; offset < rowCount; offset += BATCH_CHUNK_SIZE) {
			const prepared = [];
			const end = Math.min(offset + BATCH_CHUNK_SIZE, rowCount);
			for (let i = offset; i < end; i++) {
				const row = taskRow(i);
				prepared.push(
					tasks.prepareCreate((record) => {
						record._raw.id = String(row.id);
						record._raw.status = String(row.status);
						record._raw.priority = Number(row.priority);
					}),
				);
			}
			await database.batch(...prepared);
		}
	});
}

/**
 * Runs WatermelonDB benchmark scenarios matching the Melon harness.
 */
export async function runWdbScenarios(scale: number): Promise<BenchResult[]> {
	const results: BenchResult[] = [];

	{
		const database = createWdbDatabase();
		const durationMs = await measureMs(() => seedRowInsert(database, scale));
		results.push({
			engine: "watermelon",
			scale,
			scenario: "row-insert",
			durationMs,
			rowCount: scale,
		});

		const queryMs = await measureMs(async () => {
			const rows = await database
				.get<Task>("tasks")
				.query(
					Q.where("status", "open"),
					Q.sortBy("priority", Q.desc),
					Q.take(20),
				)
				.fetch();
			if (rows.length === 0) {
				throw new Error("expected filtered rows");
			}
		});
		results.push({
			engine: "watermelon",
			scale,
			scenario: "filtered-query",
			durationMs: queryMs,
			resultCount: 20,
		});

		const countMs = await measureMs(async () => {
			const count = await database
				.get<Task>("tasks")
				.query(Q.where("status", "open"))
				.fetchCount();
			if (count === 0) {
				throw new Error("expected count > 0");
			}
		});
		results.push({
			engine: "watermelon",
			scale,
			scenario: "count-query",
			durationMs: countMs,
		});

		const findByIdMs = await measureMs(async () => {
			const row = await database.get<Task>("tasks").find("task_0");
			if (!row) {
				throw new Error("expected task_0");
			}
		});
		results.push({
			engine: "watermelon",
			scale,
			scenario: "find-by-id",
			durationMs: findByIdMs,
		});

		await closeWdbDatabase(database);
	}

	if (scale <= 50_000) {
		const database = createWdbDatabase();
		const durationMs = await measureMs(() => seedBatchInsert(database, scale));
		results.push({
			engine: "watermelon",
			scale,
			scenario: "batch-insert",
			durationMs,
			rowCount: scale,
		});
		await closeWdbDatabase(database);
	}

	return results;
}
