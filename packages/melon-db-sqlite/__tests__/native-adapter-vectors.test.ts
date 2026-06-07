import { Database, type SQLQueryBindings } from "bun:sqlite";
import { afterEach, describe, mock, test } from "bun:test";
import { runAdapterCrudVectors } from "../../melon-db/__fixtures__/run-adapter-crud-vectors.ts";
import { createSqliteAdapterFromDriver } from "../src/adapter-core.ts";
import { createNativeDriver } from "../src/drivers/native.ts";

function toBindings(params: ReadonlyArray<unknown>): SQLQueryBindings[] {
	return params as SQLQueryBindings[];
}

function createMockNativeModule(db: Database) {
	return {
		open: async (_path: string) => {},
		close: async () => {},
		exec: async (sql: string) => {
			db.exec(sql);
		},
		queryAll: async (sql: string, params: ReadonlyArray<unknown>) => {
			const stmt = db.query(sql);
			return stmt.all(...toBindings(params)) as Record<string, unknown>[];
		},
		queryFirst: async (sql: string, params: ReadonlyArray<unknown>) => {
			const stmt = db.query(sql);
			const row = stmt.get(...toBindings(params));
			return (row as Record<string, unknown> | null) ?? null;
		},
		run: async (sql: string, params: ReadonlyArray<unknown>) => {
			const stmt = db.query(sql);
			stmt.run(...toBindings(params));
		},
	};
}

describe("native driver CRUD vectors (mocked native module)", () => {
	let db: Database | null = null;

	afterEach(() => {
		db?.close();
		db = null;
		mock.restore();
	});

	test("passes shared adapter vectors via createNativeDriver", async () => {
		db = new Database(":memory:");
		const mockNative = createMockNativeModule(db);

		mock.module("@melon-db/db-sqlite-native", () => ({
			getMelonSQLite: () => mockNative,
			isMelonSQLiteNativeAvailable: () => true,
		}));

		await runAdapterCrudVectors(() =>
			createSqliteAdapterFromDriver(() =>
				createNativeDriver({ path: "/tmp/mock-native.db" }),
			),
		);
	});
});
