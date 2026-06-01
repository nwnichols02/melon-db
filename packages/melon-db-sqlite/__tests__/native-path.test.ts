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

	test("joins Android-style filesDir basePath", () => {
		expect(
			resolveNativeDatabasePath(
				"melon-playground-dev.db",
				"/data/user/0/com.melon.playground/files",
			),
		).toBe("/data/user/0/com.melon.playground/files/melon-playground-dev.db");
	});

	test("strips trailing slash from basePath", () => {
		expect(resolveNativeDatabasePath("melon.db", "/tmp/")).toBe(
			"/tmp/melon.db",
		);
	});
});
