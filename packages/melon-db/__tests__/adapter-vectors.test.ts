import { describe, test } from "bun:test";
import { runAdapterCrudVectors } from "../__fixtures__/run-adapter-crud-vectors.ts";
import { createInMemoryAdapter } from "../src/adapters/in-memory/adapter.ts";

describe("adapter CRUD vectors (in-memory)", () => {
	test("passes shared parity suite", async () => {
		await runAdapterCrudVectors(() => createInMemoryAdapter());
	});
});
