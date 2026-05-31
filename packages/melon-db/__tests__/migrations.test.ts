import { describe, expect, test } from "bun:test";
import {
	type DatabaseSchemaDefinition,
	type Migration,
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
} from "../src/index.ts";

const taskSchemaV1: DatabaseSchemaDefinition = {
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				title: { kind: "string" },
			},
		},
	},
};

const taskSchemaV2: DatabaseSchemaDefinition = {
	version: 2,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				title: { kind: "string" },
				dueDate: { kind: "date", nullable: true },
			},
		},
	},
};

const upgradeMigration: Migration[] = [
	{
		toVersion: 1,
		steps: [{ type: "createTable", collection: "tasks" }],
	},
	{
		toVersion: 2,
		steps: [
			{
				type: "addColumns",
				collection: "tasks",
				fields: { dueDate: { kind: "date", nullable: true } },
			},
		],
	},
];

describe("migrations", () => {
	test("fresh install runs migrations to latest version", async () => {
		const schema = createMelonSchema(taskSchemaV2);
		const db = createDatabase({
			schema,
			adapter: createInMemoryAdapter(),
			migrations: upgradeMigration,
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "t1",
				title: "Migrate me",
				dueDate: new Date("2026-01-01"),
			});
		});

		const task = await db.collection("tasks").findById("t1");
		expect(task?.title).toBe("Migrate me");
		expect(task?.dueDate).toEqual(new Date("2026-01-01"));
	});

	test("upgrade from v1 preserves rows and adds columns", async () => {
		const adapter = createInMemoryAdapter();
		await adapter.initialize(createMelonSchema(taskSchemaV1));

		await adapter.write({
			type: "insert",
			collection: "tasks",
			values: { id: "t1", title: "Keep me" },
		});

		const db = createDatabase({
			schema: createMelonSchema(taskSchemaV2),
			adapter,
			migrations: upgradeMigration,
		});

		await db.read(async (tx) => {
			const task = await tx.collection("tasks").findById("t1");
			expect(task?.title).toBe("Keep me");
			expect(task?.dueDate).toBeNull();
		});
	});
});
