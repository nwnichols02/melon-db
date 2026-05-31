import type { StorageAdapter } from "../src/adapter.ts";
import { createDatabase } from "../src/database/create-database.ts";
import type { MelonDatabase } from "../src/database/types.ts";
import { MelonError } from "../src/errors.ts";
import { createMelonSchema } from "../src/schema.ts";
import {
	adapterCrudSchemaDefinition,
	filterSortLimitQuery,
	filterSortLimitSeeds,
	insertFindUpdateDeleteSeed,
} from "./adapter-crud-vectors.ts";

/**
 * Runs shared CRUD parity scenarios against any StorageAdapter factory.
 */
export async function runAdapterCrudVectors(
	createAdapter: () => StorageAdapter,
): Promise<void> {
	const schema = createMelonSchema(adapterCrudSchemaDefinition);
	const db = createDatabase({ schema, adapter: createAdapter() });

	await runInsertFindUpdateDelete(db);
	await runFilterSortLimit(db);
	await runWriteGuard(db);
	await runSerializedWrites(db);

	await db.adapter.close();
}

async function runInsertFindUpdateDelete(db: MelonDatabase): Promise<void> {
	const seed = insertFindUpdateDeleteSeed;

	await db.write(async (tx) => {
		await tx.collection("tasks").insert(seed);
	});

	const found = await db.collection("tasks").findById(seed.id);
	if (found?.title !== seed.title) {
		throw new Error(`Expected title "${seed.title}", got "${found?.title}"`);
	}

	await db.write(async (tx) => {
		await tx.collection("tasks").update(seed.id, { title: "Updated" });
	});

	const updated = await db.collection("tasks").findById(seed.id);
	if (updated?.title !== "Updated") {
		throw new Error('Expected title "Updated" after update');
	}

	await db.write(async (tx) => {
		await tx.collection("tasks").delete(seed.id);
	});

	const gone = await db.collection("tasks").findById(seed.id);
	if (gone !== null) {
		throw new Error("Expected record to be deleted");
	}
}

async function runFilterSortLimit(db: MelonDatabase): Promise<void> {
	await db.write(async (tx) => {
		const tasks = tx.collection("tasks");
		for (const seed of filterSortLimitSeeds) {
			await tasks.insert(seed);
		}
	});

	const rows = await db.collection("tasks").findMany(filterSortLimitQuery);
	if (rows.length !== 1) {
		throw new Error(`Expected 1 row, got ${rows.length}`);
	}
	if (rows[0]?.id !== "a") {
		throw new Error(`Expected id "a", got "${rows[0]?.id}"`);
	}
}

async function runWriteGuard(db: MelonDatabase): Promise<void> {
	try {
		await db.collection("tasks").insert({
			id: "x",
			title: "X",
			status: "open",
			priority: 0,
			updatedAt: new Date(),
		});
		throw new Error("Expected write outside db.write() to throw");
	} catch (error) {
		if (!(error instanceof MelonError)) {
			throw error;
		}
	}
}

async function runSerializedWrites(db: MelonDatabase): Promise<void> {
	const order: number[] = [];

	await Promise.all([
		db.write(async (tx) => {
			order.push(1);
			await tx.collection("tasks").insert({
				id: "1",
				title: "1",
				status: "open",
				priority: 1,
				updatedAt: new Date(),
			});
		}),
		db.write(async (tx) => {
			order.push(2);
			await tx.collection("tasks").insert({
				id: "2",
				title: "2",
				status: "open",
				priority: 2,
				updatedAt: new Date(),
			});
		}),
	]);

	if (order[0] !== 1 || order[1] !== 2) {
		throw new Error(
			`Expected serialized writes [1, 2], got [${order.join(", ")}]`,
		);
	}
}
