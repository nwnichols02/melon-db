import { describe, expect, test } from "bun:test";
import { withTestDatabase } from "../src/with-test-database.ts";

describe("withTestDatabase", () => {
	test("provides isolated db", async () => {
		const result = await withTestDatabase(
			{
				version: 1,
				collections: {
					items: {
						name: "items",
						primaryKey: "id",
						fields: { id: { kind: "string" }, label: { kind: "string" } },
					},
				},
			},
			async ({ db }) => {
				await db.write(async (tx) => {
					await tx.collection("items").insert({ id: "a", label: "A" });
				});
				const count = await db.collection("items").count();
				return count;
			},
		);
		expect(result).toBe(1);
	});
});
