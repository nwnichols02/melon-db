import { describe, expect, test } from "bun:test";
import { normalizeMangoQuery } from "../src/normalizer.ts";

describe("normalizeMangoQuery", () => {
	test("defaults mode to many", () => {
		const normalized = normalizeMangoQuery({ selector: { status: "open" } });
		expect(normalized.mode).toBe("many");
	});

	test("preserves count mode", () => {
		const normalized = normalizeMangoQuery({
			selector: { status: "open" },
			mode: "count",
		});
		expect(normalized.mode).toBe("count");
	});
});
