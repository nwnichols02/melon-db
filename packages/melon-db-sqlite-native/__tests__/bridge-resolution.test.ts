import { afterEach, describe, expect, mock, test } from "bun:test";

describe("MelonSQLite bridge resolution", () => {
	afterEach(() => {
		mock.restore();
	});

	test("prefers TurboModule over NativeModules bridge", async () => {
		const turboCalls: string[] = [];
		const bridgeCalls: string[] = [];

		mock.module("react-native", () => ({
			TurboModuleRegistry: {
				get: (name: string) => {
					if (name === "MelonSQLite") {
						turboCalls.push("get");
						return {
							open: async () => {},
							close: async () => {},
							exec: async () => {},
							queryAll: async () => [],
							queryFirst: async () => null,
							run: async () => {},
						};
					}
					return null;
				},
			},
			NativeModules: {
				MelonSQLite: {
					open: async () => {
						bridgeCalls.push("open");
					},
					close: async () => {},
					exec: async () => {},
					queryAll: async () => [],
					queryFirst: async () => null,
					run: async () => {},
				},
			},
		}));

		const { getMelonSQLiteModule, getMelonSQLiteNativeMode } = await import(
			"../src/MelonSQLiteBridge.ts"
		);

		expect(getMelonSQLiteNativeMode()).toBe("turbo");
		expect(getMelonSQLiteModule()).not.toBeNull();
		expect(turboCalls).toContain("get");
		expect(bridgeCalls).toHaveLength(0);
	});

	test("falls back to NativeModules when TurboModule is absent", async () => {
		mock.module("react-native", () => ({
			TurboModuleRegistry: {
				get: () => null,
			},
			NativeModules: {
				MelonSQLite: {
					open: async () => {},
					close: async () => {},
					exec: async () => {},
					queryAll: async () => [],
					queryFirst: async () => null,
					run: async () => {},
				},
			},
		}));

		const { getMelonSQLiteModule, getMelonSQLiteNativeMode } = await import(
			"../src/MelonSQLiteBridge.ts"
		);

		expect(getMelonSQLiteNativeMode()).toBe("bridge");
		expect(getMelonSQLiteModule()).not.toBeNull();
	});
});
