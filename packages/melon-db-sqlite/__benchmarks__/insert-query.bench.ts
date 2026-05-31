/**
 * Benchmark: insert 10k tasks and run a filtered/sorted query.
 * Run: bun run packages/melon-db-sqlite/__benchmarks__/insert-query.bench.ts
 */
import {
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
	predicate,
	queryAst,
} from "@melon/db";
import { createSqliteAdapter } from "../src/adapter.ts";

const ROW_COUNT = 10_000;

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

const query = queryAst("tasks", {
	where: predicate("status", "eq", "open"),
	orderBy: [{ field: "priority", direction: "desc" }],
	limit: 20,
});

async function bench(
	label: string,
	createAdapter: () => ReturnType<typeof createSqliteAdapter>,
): Promise<void> {
	const db = createDatabase({ schema, adapter: createAdapter() });

	const insertStart = performance.now();
	await db.write(async (tx) => {
		const tasks = tx.collection("tasks");
		for (let i = 0; i < ROW_COUNT; i++) {
			await tasks.insert({
				id: `task_${i}`,
				status: i % 2 === 0 ? "open" : "closed",
				priority: i % 10,
			});
		}
	});
	const insertMs = performance.now() - insertStart;

	const queryStart = performance.now();
	const rows = await db.collection("tasks").findMany(query);
	const queryMs = performance.now() - queryStart;

	await db.adapter.close();

	console.log(`[${label}] insert ${ROW_COUNT} rows: ${insertMs.toFixed(1)}ms`);
	console.log(
		`[${label}] query (${rows.length} rows): ${queryMs.toFixed(2)}ms`,
	);
}

console.log(`Melon benchmark (${ROW_COUNT} rows)\n`);
await bench("sqlite :memory:", () =>
	createSqliteAdapter({ filename: ":memory:" }),
);
await bench("in-memory", () => createInMemoryAdapter());
