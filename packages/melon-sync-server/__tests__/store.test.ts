import { describe, expect, test } from "bun:test";
import { InMemorySyncStore } from "../src/store.ts";

describe("InMemorySyncStore", () => {
	test("push then pull roundtrip", async () => {
		const store = new InMemorySyncStore();
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
		expect(store.getRecord("1")?.title).toBe("Hello");
	});

	test("incremental pull returns updates only", async () => {
		const store = new InMemorySyncStore();
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
});
