import { describe, expect, test } from "bun:test";
import { createMemoryDevtoolsBridge } from "../src/bridge.ts";
import { createReactiveDevtoolsBridge } from "../src/reactive-bridge.ts";

describe("createMemoryDevtoolsBridge", () => {
	test("records query events", () => {
		const bridge = createMemoryDevtoolsBridge();
		bridge.emitQuery({
			source: "melon",
			input: {},
			ast: { collection: "tasks", mode: "many" },
			plan: { stableSort: [] },
		});
		expect(bridge.log.queries).toHaveLength(1);
	});
});

describe("createReactiveDevtoolsBridge", () => {
	test("subscribe receives notification on emit", () => {
		const bridge = createReactiveDevtoolsBridge();
		let callCount = 0;
		const unsubscribe = bridge.subscribe(() => {
			callCount += 1;
		});

		bridge.emitQuery({
			source: "melon",
			input: {},
			ast: { collection: "tasks", mode: "many" },
			plan: { stableSort: [] },
		});

		expect(callCount).toBe(1);
		expect(bridge.getSnapshot().queries).toHaveLength(1);
		unsubscribe();

		bridge.emitWrite({
			type: "insert",
			collection: "tasks",
			values: { id: "1" },
		});
		expect(callCount).toBe(1);
	});

	test("ring buffer evicts oldest query when over limit", () => {
		const bridge = createReactiveDevtoolsBridge({ maxQueries: 2 });

		for (let index = 0; index < 3; index += 1) {
			bridge.emitQuery({
				source: "melon",
				input: { index },
				ast: { collection: "tasks", mode: "many" },
				plan: { stableSort: [] },
			});
		}

		expect(bridge.log.queries).toHaveLength(2);
		expect(bridge.log.queries[0]?.input).toEqual({ index: 1 });
		expect(bridge.log.queries[1]?.input).toEqual({ index: 2 });
	});

	test("clear resets log and notifies subscribers", () => {
		const bridge = createReactiveDevtoolsBridge();
		let callCount = 0;
		bridge.subscribe(() => {
			callCount += 1;
		});

		bridge.emitQuery({
			source: "melon",
			input: {},
			ast: { collection: "tasks", mode: "many" },
			plan: { stableSort: [] },
		});
		bridge.emitSync({
			phase: "pull",
			lastPulledAt: null,
			timestamp: Date.now(),
		});

		bridge.clear();
		expect(bridge.log.queries).toHaveLength(0);
		expect(bridge.log.sync).toHaveLength(0);
		expect(callCount).toBe(3);
	});
});
