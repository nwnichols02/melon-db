import { describe, expect, test } from "bun:test";
import { buildRnParityReport } from "../src/bench/compare-rn.ts";
import type { BenchResult } from "../src/bench/types.ts";

describe("buildRnParityReport", () => {
	test("computes ratio and winner when jsi-sync is faster", () => {
		const results: BenchResult[] = [
			{
				engine: "melon-jsi-sync",
				scale: 10_000,
				scenario: "row-insert",
				durationMs: 50,
			},
			{
				engine: "melon-turbo",
				scale: 10_000,
				scenario: "row-insert",
				durationMs: 100,
			},
		];

		const report = buildRnParityReport(results, 10_000, "ios", [
			"jsi-sync",
			"turbo",
		]);
		expect(report.comparisons).toHaveLength(1);
		expect(report.comparisons[0]?.ratio).toBe(0.5);
		expect(report.comparisons[0]?.winner).toBe("jsi-sync");
	});

	test("skips scenarios missing either engine", () => {
		const results: BenchResult[] = [
			{
				engine: "melon-jsi-sync",
				scale: 10_000,
				scenario: "row-insert",
				durationMs: 50,
			},
		];

		const report = buildRnParityReport(results, 10_000, "android", [
			"jsi-sync",
		]);
		expect(report.comparisons).toHaveLength(0);
	});

	test("tie when timings are equal", () => {
		const results: BenchResult[] = [
			{
				engine: "melon-jsi-sync",
				scale: 1_000,
				scenario: "find-by-id",
				durationMs: 1,
			},
			{
				engine: "melon-turbo",
				scale: 1_000,
				scenario: "find-by-id",
				durationMs: 1,
			},
		];

		const report = buildRnParityReport(results, 1_000, "ios", [
			"jsi-sync",
			"turbo",
		]);
		expect(report.comparisons[0]?.winner).toBe("tie");
	});
});
