import { describe, expect, test } from "bun:test";
import {
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
} from "@melon-db/db";

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

describe("write stress", () => {
	test("serializes concurrent db.write calls", async () => {
		const db = createDatabase({
			schema,
			adapter: createInMemoryAdapter(),
		});

		const order: number[] = [];

		const first = db.write(async () => {
			order.push(1);
			await new Promise((resolve) => setTimeout(resolve, 30));
			order.push(2);
		});

		const second = db.write(async () => {
			order.push(3);
		});

		await Promise.all([first, second]);
		expect(order).toEqual([1, 2, 3]);
		await db.adapter.close();
	});

	test("tx.batch emits change notifications for all inserts", async () => {
		const db = createDatabase({
			schema,
			adapter: createInMemoryAdapter(),
		});

		const changes: string[] = [];
		const unsubscribe = db.observeCollections(["tasks"], (changeSet) => {
			const created = changeSet.collections.tasks?.created ?? [];
			for (const id of created) {
				changes.push(String(id));
			}
		});

		await db.write(async (tx) => {
			await tx.batch([
				{
					type: "insert",
					collection: "tasks",
					values: { id: "a", title: "A" },
				},
				{
					type: "insert",
					collection: "tasks",
					values: { id: "b", title: "B" },
				},
			]);
		});

		unsubscribe();
		expect(changes.sort()).toEqual(["a", "b"]);
		await db.adapter.close();
	});
});
