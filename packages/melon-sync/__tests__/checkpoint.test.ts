import { describe, expect, test } from "bun:test";
import {
	SYNC_LAST_PULLED_AT_KEY,
	createMemoryCheckpointStore,
	createMetaCheckpointStore,
} from "../src/checkpoint.ts";

describe("createMemoryCheckpointStore", () => {
	test("starts null and roundtrips timestamp", async () => {
		const store = createMemoryCheckpointStore();
		expect(await store.getLastPulledAt()).toBeNull();
		await store.setLastPulledAt(42);
		expect(await store.getLastPulledAt()).toBe(42);
	});
});

describe("createMetaCheckpointStore", () => {
	test("persists via meta get/set", async () => {
		const meta = new Map<string, string>();
		const store = createMetaCheckpointStore({
			async getMeta(key) {
				return meta.get(key) ?? null;
			},
			async setMeta(key, value) {
				meta.set(key, value);
			},
		});

		expect(await store.getLastPulledAt()).toBeNull();
		await store.setLastPulledAt(12345);
		expect(meta.get(SYNC_LAST_PULLED_AT_KEY)).toBe("12345");
		expect(await store.getLastPulledAt()).toBe(12345);
	});

	test("returns null for invalid stored value", async () => {
		const store = createMetaCheckpointStore({
			async getMeta() {
				return "not-a-number";
			},
			async setMeta() {},
		});
		expect(await store.getLastPulledAt()).toBeNull();
	});
});
