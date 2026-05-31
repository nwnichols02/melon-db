import { describe, test } from "bun:test";
import { runAdapterCrudVectors } from "../../melon-db/__fixtures__/run-adapter-crud-vectors.ts";
import { createSqliteAdapter } from "../src/adapter.ts";

describe("adapter CRUD vectors (sqlite)", () => {
	test("passes shared parity suite", async () => {
		await runAdapterCrudVectors(() =>
			createSqliteAdapter({ filename: ":memory:" }),
		);
	});
});
