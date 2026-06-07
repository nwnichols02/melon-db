import { describe, expect, test } from "bun:test";
import type { SyncBackend } from "@melon-db/sync";
import { SyncServerError, SyncServerErrorCode } from "../src/errors.ts";

/**
 * Shared contract tests for SyncBackend implementations.
 */
export function describeSyncBackendContract(
	createStore: () => Promise<SyncBackend>,
): void {
	test("push then pull roundtrip", async () => {
		const store = await createStore();
		await store.pushChanges({
			lastPulledAt: 0,
			changes: {
				tasks: {
					created: [{ id: "1", title: "Hello", status: "open" }],
					updated: [],
					deleted: [],
				},
			},
		});

		const pull = await store.pullChanges({
			lastPulledAt: null,
			schemaVersion: 1,
		});

		expect(pull.changes.tasks?.created).toHaveLength(1);
		expect(pull.changes.tasks?.created[0]?.title).toBe("Hello");
	});

	test("incremental pull returns updates only", async () => {
		const store = await createStore();
		const first = await store.pullChanges({
			lastPulledAt: null,
			schemaVersion: 1,
		});

		await store.pushChanges({
			lastPulledAt: first.timestamp,
			changes: {
				tasks: {
					created: [{ id: "1", title: "A", status: "open" }],
					updated: [],
					deleted: [],
				},
			},
		});

		const second = await store.pullChanges({
			lastPulledAt: first.timestamp,
			schemaVersion: 1,
		});
		expect(second.changes.tasks?.created).toHaveLength(1);

		const third = await store.pullChanges({
			lastPulledAt: second.timestamp,
			schemaVersion: 1,
		});
		expect(third.changes.tasks?.created).toHaveLength(0);
		expect(third.changes.tasks?.updated).toHaveLength(0);
	});

	test("update appears in updated, not created", async () => {
		const store = await createStore();
		const baseline = await store.pullChanges({
			lastPulledAt: null,
			schemaVersion: 1,
		});

		await store.pushChanges({
			lastPulledAt: baseline.timestamp,
			changes: {
				tasks: {
					created: [{ id: "1", title: "Original", status: "open" }],
					updated: [],
					deleted: [],
				},
			},
		});

		const afterCreate = await store.pullChanges({
			lastPulledAt: baseline.timestamp,
			schemaVersion: 1,
		});

		await store.pushChanges({
			lastPulledAt: afterCreate.timestamp,
			changes: {
				tasks: {
					created: [],
					updated: [{ id: "1", title: "Updated", status: "done" }],
					deleted: [],
				},
			},
		});

		const afterUpdate = await store.pullChanges({
			lastPulledAt: afterCreate.timestamp,
			schemaVersion: 1,
		});

		expect(afterUpdate.changes.tasks?.created).toHaveLength(0);
		expect(afterUpdate.changes.tasks?.updated).toHaveLength(1);
		expect(afterUpdate.changes.tasks?.updated[0]?.title).toBe("Updated");
	});

	test("delete appears in deleted on subsequent pull", async () => {
		const store = await createStore();
		const baseline = await store.pullChanges({
			lastPulledAt: null,
			schemaVersion: 1,
		});

		await store.pushChanges({
			lastPulledAt: baseline.timestamp,
			changes: {
				tasks: {
					created: [{ id: "1", title: "Delete me", status: "open" }],
					updated: [],
					deleted: [],
				},
			},
		});

		const afterCreate = await store.pullChanges({
			lastPulledAt: baseline.timestamp,
			schemaVersion: 1,
		});

		await store.pushChanges({
			lastPulledAt: afterCreate.timestamp,
			changes: {
				tasks: {
					created: [],
					updated: [],
					deleted: ["1"],
				},
			},
		});

		const afterDelete = await store.pullChanges({
			lastPulledAt: afterCreate.timestamp,
			schemaVersion: 1,
		});

		expect(afterDelete.changes.tasks?.deleted).toEqual(["1"]);
	});

	test("unknown collection in push throws UNSUPPORTED_COLLECTION", async () => {
		const store = await createStore();

		try {
			await store.pushChanges({
				lastPulledAt: 0,
				changes: {
					unknown: {
						created: [{ id: "1" }],
						updated: [],
						deleted: [],
					},
				},
			});
			expect.unreachable("Expected unsupported collection error");
		} catch (error) {
			expect(error).toBeInstanceOf(SyncServerError);
			expect((error as SyncServerError).code).toBe(
				SyncServerErrorCode.UNSUPPORTED_COLLECTION,
			);
		}
	});
}
