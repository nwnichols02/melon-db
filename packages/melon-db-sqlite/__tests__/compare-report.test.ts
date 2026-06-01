import { describe, expect, test } from "bun:test";
import { buildParityReport } from "../__benchmarks__/lib/compare-report.ts";

describe("buildParityReport", () => {
	test("computes ratio and winner from paired results", () => {
		const report = buildParityReport(
			[
				{
					engine: "melon-node",
					scale: 10_000,
					scenario: "row-insert",
					durationMs: 400,
				},
				{
					engine: "watermelon",
					scale: 10_000,
					scenario: "row-insert",
					durationMs: 500,
				},
			],
			10_000,
		);

		expect(report.comparisons).toHaveLength(1);
		expect(report.comparisons[0]?.winner).toBe("melon");
		expect(report.comparisons[0]?.ratio).toBe(0.8);
	});

	test("skips scenarios missing one engine", () => {
		const report = buildParityReport(
			[
				{
					engine: "melon-bun",
					scale: 10_000,
					scenario: "row-insert",
					durationMs: 100,
				},
			],
			10_000,
		);

		expect(report.comparisons).toHaveLength(0);
	});
});
