import {
	type MelonDatabase,
	type StorageAdapter,
	createDatabase,
} from "@melon/db";
import { createReactiveDevtoolsBridge } from "@melon/db-devtools";
import { type Task, taskSchema } from "./schema";

export const devtoolsBridge = createReactiveDevtoolsBridge();

let databasePromise: Promise<MelonDatabase<typeof taskSchema>> | null = null;

const JSI_FLAG = process.env.EXPO_PUBLIC_MELON_SQLITE === "jsi";

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
 * Creates the storage adapter: expo-sqlite (Expo Go) or JSI native (dev build).
 */
async function createAdapter(): Promise<StorageAdapter> {
	if (!JSI_FLAG) {
		const SQLite = await import("expo-sqlite");
		const { createExpoSqliteAdapter } = await import("@melon/db-sqlite/expo");
		const database = await SQLite.openDatabaseAsync("melon-playground.db");
		return createExpoSqliteAdapter({ database });
	}

	const { createJsiSqliteAdapter, isJsiSqliteAvailable } = await import(
		"@melon/db-sqlite/rn"
	);
	if (!isJsiSqliteAvailable()) {
		throw new Error(
			"Melon JSI SQLite requires a development build. Unset EXPO_PUBLIC_MELON_SQLITE or run: npx expo prebuild && npx expo run:ios",
		);
	}

	return createJsiSqliteAdapter({
		filename: "melon-playground.db",
	});
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
