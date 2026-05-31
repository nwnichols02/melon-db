import { describe, expect, test } from "bun:test";
import {
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
} from "@melon/db";
import { createMemoryCheckpointStore } from "../src/checkpoint.ts";
import { synchronize } from "../src/synchronize.ts";
import { MockSyncServer } from "./mock-backend.ts";

const syncSchema = createMelonSchema({
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				title: { kind: "string" },
				status: { kind: "string" },
			},
		},
	},
});

describe("sync conflicts", () => {
	test("client-wins keeps local pending changes over remote update", async () => {
		const server = new MockSyncServer();
		const dbA = createDatabase({
			schema: syncSchema,
			adapter: createInMemoryAdapter(),
			sync: {},
		});
		const dbB = createDatabase({
			schema: syncSchema,
			adapter: createInMemoryAdapter(),
			sync: {},
		});
		const checkpointA = createMemoryCheckpointStore();
		const checkpointB = createMemoryCheckpointStore();

		await dbA.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Original",
				status: "open",
			});
		});

		await synchronize({
			db: dbA,
			pullChanges: (args) => server.pullChanges(args),
			pushChanges: (args) => server.pushChanges(args),
			checkpointStore: checkpointA,
			retryPolicy: false,
		});

		await synchronize({
			db: dbB,
			pullChanges: (args) => server.pullChanges(args),
			pushChanges: (args) => server.pushChanges(args),
			checkpointStore: checkpointB,
			retryPolicy: false,
		});

		await dbA.write(async (tx) => {
			await tx.collection("tasks").update("1", { title: "Local edit" });
		});

		await dbB.write(async (tx) => {
			await tx.collection("tasks").update("1", { title: "Remote edit" });
		});

		await synchronize({
			db: dbB,
			pullChanges: (args) => server.pullChanges(args),
			pushChanges: (args) => server.pushChanges(args),
			checkpointStore: checkpointB,
			retryPolicy: false,
		});

		await synchronize({
			db: dbA,
			pullChanges: (args) => server.pullChanges(args),
			pushChanges: (args) => server.pushChanges(args),
			checkpointStore: checkpointA,
			retryPolicy: false,
			conflictPolicy: "client-wins",
		});

		const task = await dbA.collection("tasks").findById("1");
		expect(task?.title).toBe("Local edit");
	});
});
