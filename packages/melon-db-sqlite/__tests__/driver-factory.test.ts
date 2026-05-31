import { describe, expect, test } from "bun:test";
import { createDatabase, createMelonSchema } from "@melon/db";
import { adapterCrudSchemaDefinition } from "../../melon-db/__fixtures__/adapter-crud-vectors.ts";
import { runAdapterCrudVectors } from "../../melon-db/__fixtures__/run-adapter-crud-vectors.ts";
import { createSqliteAdapterFromDriver } from "../src/adapter-core.ts";
import { createBunDriver } from "../src/drivers/bun.ts";
import type { ExpoSqliteDatabase } from "../src/drivers/expo.ts";
import { createExpoSqliteAdapter } from "../src/expo.ts";

describe("createSqliteAdapterFromDriver", () => {
	test("passes shared CRUD vectors via bun driver factory", async () => {
		await runAdapterCrudVectors(() =>
			createSqliteAdapterFromDriver(() =>
				createBunDriver({ filename: ":memory:" }),
			),
		);
	});
});

describe("createExpoSqliteAdapter", () => {
	test("wraps db.write in BEGIN/COMMIT transaction", async () => {
		const execCalls: string[] = [];
		const rows = new Map<string, Record<string, unknown>>();

		const database: ExpoSqliteDatabase = {
			async execAsync(source: string): Promise<void> {
				execCalls.push(source);
			},

			async getAllAsync<T>(
				source: string,
				...params: (string | number | null | boolean | Uint8Array)[]
			): Promise<T[]> {
				if (source.includes('"tasks"')) {
					return [...rows.values()] as T[];
				}
				if (source.includes('"count"') || source.includes("COUNT(")) {
					return [{ count: rows.size }] as T[];
				}
				return [] as T[];
			},

			async getFirstAsync<T>(): Promise<T | null> {
				const first = rows.values().next().value;
				return (first ?? null) as T | null;
			},

			async runAsync(
				source: string,
				...params: (string | number | null | boolean | Uint8Array)[]
			): Promise<unknown> {
				if (source.includes('INSERT INTO "tasks"')) {
					rows.set(String(params[0]), {
						id: params[0],
						title: params[1],
						status: params[2],
						priority: params[3],
					});
				}
				return undefined;
			},
		};

		const schema = createMelonSchema(adapterCrudSchemaDefinition);
		const db = createDatabase({
			schema,
			adapter: createExpoSqliteAdapter({ database }),
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Expo task",
				status: "open",
				priority: 1,
				updatedAt: new Date(),
			});
		});

		expect(execCalls).toContain("BEGIN");
		expect(execCalls).toContain("COMMIT");
		const tasks = await db.collection("tasks").findMany();
		expect(tasks).toHaveLength(1);
		await db.adapter.close();
	});
});
