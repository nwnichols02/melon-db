import { Q } from "@nozbe/watermelondb";
import type { Database as WdbDatabase } from "@nozbe/watermelondb";
import { BATCH_CHUNK_SIZE, taskRow } from "./fixtures.ts";
import { measureMs } from "./measure.ts";
import type { BenchResult } from "./types.ts";
import { type BenchTask } from "./wdb-schema.ts";

type WdbTaskRaw = {
	id: string;
	status: string;
	priority: number;
};

function assignTaskRaw(
	record: { _raw: WdbTaskRaw },
	row: Record<string, unknown>,
): void {
	record._raw.id = String(row.id);
	record._raw.status = String(row.status);
	record._raw.priority = Number(row.priority);
}

export interface WdbScenarioHooks {
	createDatabase: () => WdbDatabase | Promise<WdbDatabase>;
	closeDatabase: (database: WdbDatabase) => Promise<void>;
	engineLabel?: string;
}

async function seedRowInsert(
	database: WdbDatabase,
	rowCount: number,
): Promise<void> {
	await database.write(async () => {
		const tasks = database.get<BenchTask>("tasks");
		for (let i = 0; i < rowCount; i++) {
			const row = taskRow(i);
			await tasks.create((record) => {
				assignTaskRaw(record as unknown as { _raw: WdbTaskRaw }, row);
			});
		}
	});
}

async function seedBatchInsert(
	database: WdbDatabase,
	rowCount: number,
): Promise<void> {
	await database.write(async () => {
		const tasks = database.get<BenchTask>("tasks");
		for (let offset = 0; offset < rowCount; offset += BATCH_CHUNK_SIZE) {
			const prepared = [];
			const end = Math.min(offset + BATCH_CHUNK_SIZE, rowCount);
			for (let i = offset; i < end; i++) {
				const row = taskRow(i);
				prepared.push(
					tasks.prepareCreate((record) => {
						assignTaskRaw(record as unknown as { _raw: WdbTaskRaw }, row);
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
export async function runWdbScenarios(
	scale: number,
	hooks: WdbScenarioHooks,
): Promise<BenchResult[]> {
	const engine = hooks.engineLabel ?? "watermelon";
	const results: BenchResult[] = [];

	{
		const database = await Promise.resolve(hooks.createDatabase());
		const durationMs = await measureMs(() => seedRowInsert(database, scale));
		results.push({
			engine,
			scale,
			scenario: "row-insert",
			durationMs,
			rowCount: scale,
		});

		const queryMs = await measureMs(async () => {
			const rows = await database
				.get<BenchTask>("tasks")
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
			engine,
			scale,
			scenario: "filtered-query",
			durationMs: queryMs,
			resultCount: 20,
		});

		const countMs = await measureMs(async () => {
			const count = await database
				.get<BenchTask>("tasks")
				.query(Q.where("status", "open"))
				.fetchCount();
			if (count === 0) {
				throw new Error("expected count > 0");
			}
		});
		results.push({
			engine,
			scale,
			scenario: "count-query",
			durationMs: countMs,
		});

		const findByIdMs = await measureMs(async () => {
			const row = await database.get<BenchTask>("tasks").find("task_0");
			if (!row) {
				throw new Error("expected task_0");
			}
		});
		results.push({
			engine,
			scale,
			scenario: "find-by-id",
			durationMs: findByIdMs,
		});

		await hooks.closeDatabase(database);
	}

	if (scale <= 50_000) {
		const database = await Promise.resolve(hooks.createDatabase());
		const durationMs = await measureMs(() => seedBatchInsert(database, scale));
		results.push({
			engine,
			scale,
			scenario: "batch-insert",
			durationMs,
			rowCount: scale,
		});
		await hooks.closeDatabase(database);
	}

	return results;
}
