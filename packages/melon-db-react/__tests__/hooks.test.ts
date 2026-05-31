import { describe, expect, test } from "bun:test";
import {
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
	queryAst,
} from "@melon/db";
import { compilePrismaQuery } from "@melon/db-prisma";
import { createMangoCompiler } from "@melon/db-query-mango";

const mangoCompiler = createMangoCompiler();

async function observePrepared(
	db: ReturnType<typeof createDatabase>,
	prepared: ReturnType<typeof compilePrismaQuery>,
): Promise<number[]> {
	const updates: number[] = [];
	const handle = db.collection(prepared.ast.collection).query(prepared.ast);
	handle.observe((rows) => updates.push(rows.length));
	await new Promise((r) => setTimeout(r, 5));
	return updates;
}

// Hook logic tested via observe contract (React DOM tests omitted in Bun package)
describe("db-react exports", () => {
	test("database query observe matches hook contract", async () => {
		const schema = createMelonSchema({
			version: 1,
			collections: {
				tasks: {
					name: "tasks",
					primaryKey: "id",
					fields: { id: { kind: "string" }, status: { kind: "string" } },
				},
			},
		});
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		const updates: number[] = [];
		const handle = db.collection("tasks").query(queryAst("tasks", {}));
		handle.observe((rows) => updates.push(rows.length));
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({ id: "1", status: "open" });
		});
		await new Promise((r) => setTimeout(r, 15));
		expect(updates.length).toBeGreaterThanOrEqual(2);
		expect(updates.at(-1)).toBe(1);
	});

	test("useFindMany observe contract via compilePrismaQuery", async () => {
		const schema = createMelonSchema({
			version: 1,
			collections: {
				tasks: {
					name: "tasks",
					primaryKey: "id",
					fields: {
						id: { kind: "string" },
						status: { kind: "string" },
					},
				},
			},
		});
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		const prepared = compilePrismaQuery(
			"tasks",
			{ where: { status: "open" } },
			schema,
		);
		const updates = await observePrepared(db, prepared);
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({ id: "1", status: "open" });
		});
		await new Promise((r) => setTimeout(r, 15));
		expect(updates.length).toBeGreaterThanOrEqual(2);
		expect(updates.at(-1)).toBe(1);
	});

	test("useMangoQuery observe contract via mango compiler", async () => {
		const schema = createMelonSchema({
			version: 1,
			collections: {
				tasks: {
					name: "tasks",
					primaryKey: "id",
					fields: {
						id: { kind: "string" },
						status: { kind: "string" },
					},
				},
			},
		});
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		const prepared = mangoCompiler.compile(
			{ selector: { status: { $eq: "open" } } },
			"tasks",
			schema,
		);
		const updates = await observePrepared(db, prepared);
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({ id: "1", status: "open" });
		});
		await new Promise((r) => setTimeout(r, 15));
		expect(updates.length).toBeGreaterThanOrEqual(2);
		expect(updates.at(-1)).toBe(1);
	});
});
