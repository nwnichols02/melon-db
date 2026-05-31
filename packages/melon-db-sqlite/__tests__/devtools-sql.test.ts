import { describe, expect, test } from "bun:test";
import {
	createDatabase,
	createMelonSchema,
	predicate,
	queryAst,
} from "@melon/db";
import { createMemoryDevtoolsBridge } from "@melon/db-devtools";
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

describe("devtools SQL snapshots", () => {
	test("sqlite adapter records SQL in devtools bridge", async () => {
		const devtools = createMemoryDevtoolsBridge();
		const db = createDatabase({
			schema,
			adapter: createSqliteAdapter({ filename: ":memory:" }),
			devtools,
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({ id: "1", status: "open" });
		});

		await db
			.collection("tasks")
			.findMany(
				queryAst("tasks", { where: predicate("status", "eq", "open") }),
			);

		expect(devtools.log.queries.length).toBeGreaterThan(0);
		const last = devtools.log.queries.at(-1);
		expect(last?.sql).toContain("SELECT");
		expect(last?.sql).toContain('"tasks"');
	});
});
