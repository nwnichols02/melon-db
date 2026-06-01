import { describe, expect, test } from "bun:test";
import { resolveNativeDatabasePath } from "../src/native-path.ts";

describe("resolveNativeDatabasePath", () => {
	test("joins basePath and filename", () => {
		expect(resolveNativeDatabasePath("melon.db", "/var/mobile/Documents")).toBe(
			"/var/mobile/Documents/melon.db",
		);
	});

	test("accepts absolute filename", () => {
		expect(resolveNativeDatabasePath("/tmp/melon.db")).toBe("/tmp/melon.db");
	});

	test("rejects path traversal", () => {
		expect(() =>
			resolveNativeDatabasePath("../etc/passwd", "/var/mobile/Documents"),
		).toThrow(/path traversal/);
	});

	test("requires basePath for relative filename", () => {
		expect(() => resolveNativeDatabasePath("melon.db")).toThrow(/basePath/);
	});
});
