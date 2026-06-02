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

	test("copies sort array without mutating input", () => {
		const sort: Array<Record<string, "asc" | "desc">> = [{ priority: "desc" }];
		const query = { selector: { status: "open" }, sort };
		const normalized = normalizeMangoQuery(query);
		expect(normalized.sort).toEqual(sort);
		expect(normalized.sort).not.toBe(sort);
		sort[0] = { priority: "asc" };
		expect(normalized.sort?.[0]?.priority).toBe("desc");
	});
});
