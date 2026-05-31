import { describe, expect, test } from "bun:test";
import { createMemoryDevtoolsBridge } from "../src/bridge.ts";

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
