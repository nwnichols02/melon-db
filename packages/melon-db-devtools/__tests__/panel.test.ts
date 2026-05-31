import { describe, expect, test } from "bun:test";
import { createReactiveDevtoolsBridge } from "../src/reactive-bridge.ts";

describe("MelonDevtoolsPanel contract", () => {
	test("bridge emits query with SQL visible in snapshot", () => {
		const bridge = createReactiveDevtoolsBridge();

		bridge.emitQuery({
			source: "melon",
			input: {},
			ast: { collection: "tasks", mode: "many" },
			plan: { stableSort: [] },
			sql: "SELECT * FROM tasks WHERE status = ?",
			durationMs: 2.5,
		});

		const snapshot = bridge.getSnapshot();
		expect(snapshot.queries).toHaveLength(1);
		expect(snapshot.queries[0]?.sql).toBe(
			"SELECT * FROM tasks WHERE status = ?",
		);
	});

	test("bridge emits sync phase events", () => {
		const bridge = createReactiveDevtoolsBridge();
		const phases: string[] = [];

		bridge.subscribe(() => {
			const latest = bridge.getSnapshot().sync.at(-1);
			if (latest) {
				phases.push(latest.phase);
			}
		});

		bridge.emitSync({
			phase: "pull",
			lastPulledAt: null,
			timestamp: Date.now(),
		});
		bridge.emitSync({
			phase: "complete",
			lastPulledAt: 1000,
			timestamp: Date.now(),
			durationMs: 42,
		});

		expect(phases).toEqual(["pull", "complete"]);
		expect(bridge.getSnapshot().sync).toHaveLength(2);
		expect(bridge.getSnapshot().sync[1]?.phase).toBe("complete");
	});
});
