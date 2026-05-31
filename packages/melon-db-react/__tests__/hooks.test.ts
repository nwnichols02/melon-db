import { describe, expect, test } from "bun:test";
import {
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
	queryAst,
} from "@melon/db";

// Hook logic tested via observe contract (React DOM tests omitted in Bun package)
describe("db-react exports", () => {
	test("database query observe matches hook contract", async () => {
		const schema = createMelonSchema({
			version: 1,
			collections: {
				tasks: {
					name: "tasks",
					primaryKey: "id",
					fields: { id: { kind: "string" }, status: { kind: "string" } },
				},
			},
		});
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		const updates: number[] = [];
		const handle = db.collection("tasks").query(queryAst("tasks", {}));
		handle.observe((rows) => updates.push(rows.length));
		await db.write(async (tx) => {
			await tx.collection("tasks").insert({ id: "1", status: "open" });
		});
		await new Promise((r) => setTimeout(r, 15));
		expect(updates.length).toBeGreaterThanOrEqual(2);
		expect(updates.at(-1)).toBe(1);
	});
});
