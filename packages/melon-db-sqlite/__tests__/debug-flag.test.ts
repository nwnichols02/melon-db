import { describe, expect, test } from "bun:test";
import type { QueryExecutionDebug } from "@melon/db";
import {
	createDatabase,
	createMelonSchema,
	predicate,
	queryAst,
} from "@melon/db";
import { createSqliteAdapter } from "../src/adapter.ts";

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

describe("debug flag", () => {
	test("onQueryDebug receives SQL on find when debug is true", async () => {
		const captured: QueryExecutionDebug[] = [];
		const db = createDatabase({
			schema,
			adapter: createSqliteAdapter({
				filename: ":memory:",
				debug: true,
				onQueryDebug: (debug) => captured.push(debug),
			}),
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({ id: "1", status: "open" });
		});

		await db
			.collection("tasks")
			.findMany(
				queryAst("tasks", { where: predicate("status", "eq", "open") }),
			);

		expect(captured.length).toBeGreaterThanOrEqual(2);
		const findDebug = captured.find(
			(entry) =>
				entry.sql?.includes("SELECT") && entry.sql.includes('"status"'),
		);
		expect(findDebug?.sql).toContain('"tasks"');
		expect(findDebug?.params).toContain("open");

		const insertDebug = captured.find((entry) => entry.sql?.includes("INSERT"));
		expect(insertDebug?.sql).toContain("INSERT INTO");

		await db.adapter.close();
	});

	test("onQueryDebug is not called when debug is false", async () => {
		const captured: QueryExecutionDebug[] = [];
		const db = createDatabase({
			schema,
			adapter: createSqliteAdapter({
				filename: ":memory:",
				debug: false,
				onQueryDebug: (debug) => captured.push(debug),
			}),
		});

		await db.collection("tasks").findMany();
		expect(captured).toHaveLength(0);
		await db.adapter.close();
	});
});
