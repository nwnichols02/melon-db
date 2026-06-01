import { afterEach, describe, expect, mock, test } from "bun:test";

describe("createNativeJsiSyncDriver with mocked host object", () => {
	const calls: string[] = [];

	const mockJsi = {
		openSync: (path: string) => {
			calls.push(`open:${path}`);
		},
		closeSync: () => {
			calls.push("close");
		},
		execSync: (sql: string) => {
			calls.push(`exec:${sql}`);
		},
		queryAllSync: () => [] as Record<string, unknown>[],
		queryFirstSync: () => null,
		runSync: (sql: string) => {
			calls.push(`run:${sql}`);
		},
	};

	afterEach(() => {
		calls.length = 0;
		globalThis.melonSqliteJsi = undefined;
	});

	test("transaction uses BEGIN/COMMIT via sync JSI", async () => {
		globalThis.melonSqliteJsi = mockJsi;

		const { createNativeJsiSyncDriver } = await import(
			"../src/drivers/native-jsi-sync.ts"
		);
		const driver = await createNativeJsiSyncDriver({
			path: "/tmp/mock-jsi.db",
		});
		await driver.transaction(async () => {
			await driver.run("INSERT INTO t VALUES (?)", [1]);
		});
		await driver.close();

		expect(calls).toContain("open:/tmp/mock-jsi.db");
		expect(calls).toContain("exec:BEGIN");
		expect(calls).toContain("exec:COMMIT");
		expect(calls).toContain("close");
	});
});

describe("createJsiSqliteAdapter mode selection", () => {
	afterEach(() => {
		mock.restore();
		globalThis.melonSqliteJsi = undefined;
	});

	test("mode jsi-sync uses sync driver when host object installed", async () => {
		globalThis.melonSqliteJsi = {
			openSync: () => {},
			closeSync: () => {},
			execSync: () => {},
			queryAllSync: () => [],
			queryFirstSync: () => null,
			runSync: () => {},
		};

		const { createJsiSqliteAdapter } = await import("../src/rn.ts");
		const adapter = createJsiSqliteAdapter({
			filename: "test.db",
			basePath: "/tmp",
			mode: "jsi-sync",
		});
		expect(adapter.name).toBe("sqlite");
	});
});
