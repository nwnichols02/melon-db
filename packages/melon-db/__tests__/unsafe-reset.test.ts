import { describe, expect, test } from "bun:test";
import {
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
} from "@melon/db";

const schema = createMelonSchema({
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				title: { kind: "string" },
			},
		},
	},
});

describe("unsafeReset", () => {
	test("clears all rows in in-memory adapter", async () => {
		const db = createDatabase({
			schema,
			adapter: createInMemoryAdapter(),
		});

		await db.write(async (tx) => {
			await tx.collection("tasks").insert({ id: "1", title: "Hello" });
		});

		expect(await db.collection("tasks").count()).toBe(1);

		await db.unsafeReset();

		expect(await db.collection("tasks").count()).toBe(0);
		await db.adapter.close();
	});
});
