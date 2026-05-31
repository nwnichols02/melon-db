import { createDatabase, type MelonDatabase } from "@melon/db";
import type { SQLiteDatabase } from "expo-sqlite";
import { createExpoSqliteAdapter } from "@melon/db-sqlite/expo";
import * as SQLite from "expo-sqlite";
import { type Task, taskSchema } from "./schema";

let databasePromise: Promise<MelonDatabase<typeof taskSchema>> | null = null;

/**
 * Opens the local Melon database and seeds demo tasks when empty.
 */
export async function getDatabase(): Promise<
	MelonDatabase<typeof taskSchema>
> {
	if (!databasePromise) {
		databasePromise = bootstrap();
	}
	return databasePromise;
}

async function bootstrap(): Promise<MelonDatabase<typeof taskSchema>> {
	const expoDb: SQLiteDatabase = await SQLite.openDatabaseAsync(
		"melon-playground.db",
	);
	const db = createDatabase({
		schema: taskSchema,
		adapter: createExpoSqliteAdapter({ database: expoDb }),
	});

	const existing = await db.collection("tasks").count();
	if (existing === 0) {
		await seedTasks(db);
	}

	return db;
}

async function seedTasks(
	db: MelonDatabase<typeof taskSchema>,
): Promise<void> {
	const seeds: Task[] = [
		{
			id: "1",
			title: "Learn Melon",
			status: "open",
			priority: 1,
			updatedAt: new Date(),
		},
		{
			id: "2",
			title: "Ship playground-rn",
			status: "open",
			priority: 2,
			updatedAt: new Date(),
		},
	];

	await db.write(async (tx) => {
		for (const task of seeds) {
			await tx.collection("tasks").insert({ ...task });
		}
	});
}
