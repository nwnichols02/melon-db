import type { AdapterWriteOperation } from "@melon/db";
import {
	type MelonDatabase,
	type StorageAdapter,
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
	predicate,
	queryAst,
} from "@melon/db";
import { createSqliteAdapter } from "../../src/adapter.ts";
import type { BenchResult } from "./bench-runner.ts";
import { measureMs } from "./bench-runner.ts";

const BATCH_CHUNK_SIZE = 500;

const schema = createMelonSchema({
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				status: { kind: "string" },
				priority: { kind: "number" },
			},
			indexes: [["status"]],
		},
	},
});

const filteredQuery = queryAst("tasks", {
	where: predicate("status", "eq", "open"),
	orderBy: [{ field: "priority", direction: "desc" }],
	limit: 20,
});

const countQuery = queryAst("tasks", {
	mode: "count",
	where: predicate("status", "eq", "open"),
});

function taskRow(i: number): Record<string, unknown> {
	return {
		id: `task_${i}`,
		status: i % 2 === 0 ? "open" : "closed",
		priority: i % 10,
	};
}

function createAdapter(kind: "sqlite" | "memory"): StorageAdapter {
	if (kind === "memory") {
		return createInMemoryAdapter();
	}
	return createSqliteAdapter({ filename: ":memory:" });
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
 * Runs all benchmark scenarios for one adapter and scale.
 */
export async function runScenarios(
	adapterKind: "sqlite" | "memory",
	scale: number,
): Promise<BenchResult[]> {
	const adapterLabel = adapterKind === "sqlite" ? "sqlite" : "in-memory";
	const results: BenchResult[] = [];

	{
		const db = createDatabase({ schema, adapter: createAdapter(adapterKind) });
		const durationMs = await measureMs(() => seedRowInsert(db, scale));
		results.push({
			adapter: adapterLabel,
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
			adapter: adapterLabel,
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
			adapter: adapterLabel,
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
			adapter: adapterLabel,
			scale,
			scenario: "find-by-id",
			durationMs: findByIdMs,
		});

		await db.adapter.close();
	}

	if (scale <= 50_000) {
		const db = createDatabase({ schema, adapter: createAdapter(adapterKind) });
		const durationMs = await measureMs(() => seedBatchInsert(db, scale));
		results.push({
			adapter: adapterLabel,
			scale,
			scenario: "batch-insert",
			durationMs,
			rowCount: scale,
		});
		await db.adapter.close();
	}

	return results;
}
