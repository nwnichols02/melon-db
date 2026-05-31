import { describe, expect, test } from "bun:test";
import { adapterCrudSchemaDefinition } from "../__fixtures__/adapter-crud-vectors.ts";
import { runAdapterCrudVectors } from "../__fixtures__/run-adapter-crud-vectors.ts";
import { createInMemoryAdapter } from "../src/adapters/in-memory/adapter.ts";
import { createDatabase } from "../src/database/create-database.ts";
import { createMelonSchema } from "../src/schema.ts";

describe("CRUD", () => {
	test("shared adapter vectors", async () => {
		await runAdapterCrudVectors(() => createInMemoryAdapter());
	});

	test("count initializes adapter before first write", async () => {
		const schema = createMelonSchema(adapterCrudSchemaDefinition);
		const db = createDatabase({
			schema,
			adapter: createInMemoryAdapter(),
		});
		expect(await db.collection("tasks").count()).toBe(0);
		await db.adapter.close();
	});
});
