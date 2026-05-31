import { describe, expect, test } from "bun:test";
import {
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
} from "@melon/db";
import { createMemoryCheckpointStore } from "../src/checkpoint.ts";
import { SyncErrorCode } from "../src/errors.ts";
import { createMutableNetworkMonitor } from "../src/network.ts";
import { SyncStatusKind } from "../src/state.ts";
import type { SynchronizeArgs } from "../src/synchronize.ts";
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

function createSyncClient(server: MockSyncServer) {
	const db = createDatabase({
		schema: syncSchema,
		adapter: createInMemoryAdapter(),
		sync: {},
	});

	return {
		db,
		sync: (extra?: Partial<SynchronizeArgs>) =>
			synchronize({
				db,
				pullChanges: (args) => server.pullChanges(args),
				pushChanges: (args) => server.pushChanges(args),
				checkpointStore: createMemoryCheckpointStore(),
				retryPolicy: false,
				...extra,
			}),
	};
}

describe("synchronize", () => {
	test("client A push then client B pull roundtrip", async () => {
		const server = new MockSyncServer();
		const clientA = createSyncClient(server);
		const clientB = createSyncClient(server);

		await clientA.db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "From A",
				status: "open",
			});
		});

		await clientA.sync();

		expect(server.getRecord("1")?.title).toBe("From A");

		await clientB.sync();

		const task = await clientB.db.collection("tasks").findById("1");
		expect(task?.title).toBe("From A");
	});

	test("empty sync completes without push", async () => {
		const server = new MockSyncServer();
		const client = createSyncClient(server);

		const statuses: string[] = [];
		await client.sync({
			onStatusChange: (status) => statuses.push(status.status),
		});

		expect(statuses).toContain(SyncStatusKind.Complete);
	});

	test("push failure preserves outbox and checkpoint", async () => {
		const server = new MockSyncServer();
		const checkpoint = createMemoryCheckpointStore();
		const db = createDatabase({
			schema: syncSchema,
			adapter: createInMemoryAdapter(),
			sync: {},
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Retry me",
				status: "open",
			});
		});

		try {
			await synchronize({
				db,
				pullChanges: (args) => server.pullChanges(args),
				pushChanges: async () => {
					throw new Error("network down");
				},
				checkpointStore: checkpoint,
				retryPolicy: false,
			});
			expect.unreachable();
		} catch (error) {
			expect((error as { code: string }).code).toBe(
				SyncErrorCode.SYNC_PUSH_FAILED,
			);
		}

		expect(await checkpoint.getLastPulledAt()).toBeNull();
		const pending = await db.getLocalChanges();
		expect(pending.tasks?.created).toHaveLength(1);
	});

	test("retry after push failure succeeds", async () => {
		const server = new MockSyncServer();
		const checkpoint = createMemoryCheckpointStore();
		const db = createDatabase({
			schema: syncSchema,
			adapter: createInMemoryAdapter(),
			sync: {},
		});
		let shouldFail = true;

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Retry me",
				status: "open",
			});
		});

		const runSync = () =>
			synchronize({
				db,
				pullChanges: (args) => server.pullChanges(args),
				pushChanges: async (args) => {
					if (shouldFail) {
						throw new Error("network down");
					}
					await server.pushChanges(args);
				},
				checkpointStore: checkpoint,
				retryPolicy: false,
			});

		try {
			await runSync();
		} catch {
			// expected
		}

		shouldFail = false;
		await runSync();

		expect(server.getRecord("1")?.title).toBe("Retry me");
		expect(await checkpoint.getLastPulledAt()).not.toBeNull();
	});

	test("onSyncEvent receives pull apply push complete sequence on success", async () => {
		const server = new MockSyncServer();
		const db = createDatabase({
			schema: syncSchema,
			adapter: createInMemoryAdapter(),
			sync: {},
		});
		const phases: string[] = [];

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Sync event",
				status: "open",
			});
		});

		await synchronize({
			db,
			pullChanges: (args) => server.pullChanges(args),
			pushChanges: (args) => server.pushChanges(args),
			checkpointStore: createMemoryCheckpointStore(),
			retryPolicy: false,
			onSyncEvent: (snapshot) => {
				phases.push(snapshot.phase);
			},
		});

		expect(phases).toEqual(["pull", "apply", "push", "checkpoint", "complete"]);
	});

	test("failed push emits failed event with retryable flag", async () => {
		const server = new MockSyncServer();
		const db = createDatabase({
			schema: syncSchema,
			adapter: createInMemoryAdapter(),
			sync: {},
		});
		const failedEvents: Array<{
			phase: string;
			retryable?: boolean;
		}> = [];

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({
				id: "1",
				title: "Fail push",
				status: "open",
			});
		});

		try {
			await synchronize({
				db,
				pullChanges: (args) => server.pullChanges(args),
				pushChanges: async () => {
					throw new Error("network down");
				},
				checkpointStore: createMemoryCheckpointStore(),
				retryPolicy: false,
				onSyncEvent: (snapshot) => {
					if (snapshot.phase === "failed") {
						failedEvents.push({
							phase: snapshot.phase,
							retryable: snapshot.error?.retryable,
						});
					}
				},
			});
		} catch {
			// expected
		}

		expect(failedEvents).toHaveLength(1);
		expect(failedEvents[0]?.retryable).toBe(true);
	});

	test("pull retries succeed on third attempt with fast policy", async () => {
		const server = new MockSyncServer();
		const client = createSyncClient(server);
		let pullCalls = 0;
		const statuses: string[] = [];

		await client.sync({
			retryPolicy: {
				maxAttempts: 3,
				baseDelayMs: 1,
				maxDelayMs: 2,
				jitter: false,
			},
			pullChanges: async (args) => {
				pullCalls += 1;
				if (pullCalls < 3) {
					throw new Error("transient pull");
				}
				return server.pullChanges(args);
			},
			onStatusChange: (status) => statuses.push(status.status),
		});

		expect(pullCalls).toBe(3);
		expect(statuses).toContain(SyncStatusKind.Retrying);
		expect(statuses).toContain(SyncStatusKind.Complete);
	});

	test("offline monitor emits paused and throws SYNC_OFFLINE", async () => {
		const server = new MockSyncServer();
		const client = createSyncClient(server);
		const monitor = createMutableNetworkMonitor(false);
		const statuses: string[] = [];

		await expect(
			client.sync({
				networkMonitor: monitor,
				onStatusChange: (status) => statuses.push(status.status),
			}),
		).rejects.toMatchObject({ code: SyncErrorCode.SYNC_OFFLINE });

		expect(statuses).toContain(SyncStatusKind.Paused);
	});

	test("strict schema mismatch throws before apply", async () => {
		const server = new MockSyncServer();
		const client = createSyncClient(server);

		await expect(
			client.sync({
				pullChanges: async (args) => ({
					...(await server.pullChanges(args)),
					schemaVersion: 0,
				}),
				migrationSyncPolicy: "strict",
			}),
		).rejects.toMatchObject({ code: SyncErrorCode.SYNC_SCHEMA_MISMATCH });
	});

	test("checkpoint stores schema version after successful sync", async () => {
		const server = new MockSyncServer();
		const checkpoint = createMemoryCheckpointStore();
		const db = createDatabase({
			schema: syncSchema,
			adapter: createInMemoryAdapter(),
			sync: {},
		});

		await synchronize({
			db,
			pullChanges: (args) => server.pullChanges(args),
			pushChanges: (args) => server.pushChanges(args),
			checkpointStore: checkpoint,
			retryPolicy: false,
		});

		expect(await checkpoint.getLastSchemaVersion?.()).toBe(1);
	});
});
