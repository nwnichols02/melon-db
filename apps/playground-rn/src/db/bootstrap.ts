import {
	type MelonDatabase,
	type StorageAdapter,
	createDatabase,
} from "@melon-db/db";
import { createReactiveDevtoolsBridge } from "@melon-db/db-devtools";
import { type Task, taskSchema } from "./schema";

const DATABASE_FILENAME = "melon-playground.db";

export const devtoolsBridge = createReactiveDevtoolsBridge();

let databasePromise: Promise<MelonDatabase<typeof taskSchema>> | null = null;

/**
 * Opens the local Melon database and seeds demo tasks when empty.
 */
export async function getDatabase(): Promise<MelonDatabase<typeof taskSchema>> {
	if (!databasePromise) {
		databasePromise = bootstrap();
	}
	return databasePromise;
}

/**
 * Expo Go: expo-sqlite via @melon-db/db-sqlite/expo.
 */
async function createAdapter(): Promise<StorageAdapter> {
	const SQLite = await import("expo-sqlite");
	const { createExpoSqliteAdapter } = await import("@melon-db/db-sqlite/expo");
	const database = await SQLite.openDatabaseAsync(DATABASE_FILENAME);
	return createExpoSqliteAdapter({ database });
}

async function bootstrap(): Promise<MelonDatabase<typeof taskSchema>> {
	const db = createDatabase({
		schema: taskSchema,
		adapter: await createAdapter(),
		devtools: devtoolsBridge,
		sync: {},
	});

	const existing = await db.collection("tasks").count();
	if (existing === 0) {
		await seedTasks(db);
	}

	return db;
}

async function seedTasks(db: MelonDatabase<typeof taskSchema>): Promise<void> {
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
