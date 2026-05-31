import { describe, test } from "bun:test";
import { runAdapterCrudVectors } from "../__fixtures__/run-adapter-crud-vectors.ts";
import { createInMemoryAdapter } from "../src/adapters/in-memory/adapter.ts";

describe("CRUD", () => {
	test("shared adapter vectors", async () => {
		await runAdapterCrudVectors(() => createInMemoryAdapter());
	});
});
