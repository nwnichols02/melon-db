import { afterEach, describe, expect, mock, test } from "bun:test";
import { createJsiSqliteAdapter, isJsiSqliteAvailable } from "../src/rn.ts";

describe("JSI SQLite (no React Native runtime)", () => {
	test("isJsiSqliteAvailable is false under Bun", () => {
		expect(isJsiSqliteAvailable()).toBe(false);
	});

	test("createJsiSqliteAdapter throws dev-build message when native missing", () => {
		expect(() =>
			createJsiSqliteAdapter({
				filename: "test.db",
				basePath: "/tmp",
			}),
		).toThrow(/development build/);
	});
});

describe("createNativeDriver with mocked native module", () => {
	const calls: string[] = [];

	const mockNative = {
		open: async (path: string) => {
			calls.push(`open:${path}`);
		},
		close: async () => {
			calls.push("close");
		},
		exec: async (sql: string) => {
			calls.push(`exec:${sql}`);
		},
		queryAll: async () => [] as Record<string, unknown>[],
		queryFirst: async () => null,
		run: async (sql: string) => {
			calls.push(`run:${sql}`);
		},
	};

	afterEach(() => {
		calls.length = 0;
		mock.restore();
	});

	test("transaction uses BEGIN/COMMIT", async () => {
		mock.module("@melon/db-sqlite-native", () => ({
			getMelonSQLite: () => mockNative,
			isMelonSQLiteNativeAvailable: () => true,
		}));

		const { createNativeDriver } = await import("../src/drivers/native.ts");
		const driver = await createNativeDriver({ path: "/tmp/mock.db" });
		await driver.transaction(async () => {
			await driver.run("INSERT INTO t VALUES (?)", [1]);
		});
		await driver.close();

		expect(calls).toContain("open:/tmp/mock.db");
		expect(calls).toContain("exec:BEGIN");
		expect(calls).toContain("exec:COMMIT");
		expect(calls).toContain("close");
	});
});
