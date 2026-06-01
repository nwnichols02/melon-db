import { afterEach, describe, expect, mock, test } from "bun:test";

describe("MelonSQLite JSI host object", () => {
	afterEach(() => {
		mock.restore();
		globalThis.melonSqliteJsi = undefined;
	});

	test("isMelonSqliteJsiInstalled is false when host object missing", async () => {
		const { isMelonSqliteJsiInstalled } = await import(
			"../src/MelonSQLiteJsi.ts"
		);
		expect(isMelonSqliteJsiInstalled()).toBe(false);
	});

	test("getMelonSQLiteNativeMode prefers jsi-sync when host object present", async () => {
		globalThis.melonSqliteJsi = {
			openSync: () => {},
			closeSync: () => {},
			execSync: () => {},
			queryAllSync: () => [],
			queryFirstSync: () => null,
			runSync: () => {},
		};

		mock.module("react-native", () => ({
			TurboModuleRegistry: {
				get: () => ({
					open: async () => {},
					close: async () => {},
					exec: async () => {},
					queryAll: async () => [],
					queryFirst: async () => null,
					run: async () => {},
				}),
			},
			NativeModules: {},
		}));

		const { isMelonSqliteJsiInstalled } = await import(
			"../src/MelonSQLiteJsi.ts"
		);
		expect(isMelonSqliteJsiInstalled()).toBe(true);

		const { getMelonSQLiteNativeMode } = await import(
			"../src/MelonSQLiteBridge.ts"
		);
		expect(getMelonSQLiteNativeMode()).toBe("jsi-sync");
	});
});
