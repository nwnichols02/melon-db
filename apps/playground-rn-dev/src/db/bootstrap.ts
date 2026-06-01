import {
	type MelonDatabase,
	type StorageAdapter,
	createDatabase,
} from "@melon/db";
import { createReactiveDevtoolsBridge } from "@melon/db-devtools";
import { type Task, taskSchema } from "./schema";

const DATABASE_FILENAME = "melon-playground-dev.db";

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
 * JSI SQLite via @melon/db-sqlite-native (development build only).
 */
async function createAdapter(): Promise<StorageAdapter> {
	const { createJsiSqliteAdapter, isJsiSqliteAvailable } = await import(
		"@melon/db-sqlite/rn"
	);
	if (!isJsiSqliteAvailable()) {
		throw new Error(
			"Melon JSI SQLite requires a native binary. " +
				"From apps/playground-rn-dev run: bun run install:ios then bun run start",
		);
	}
	return createJsiSqliteAdapter({ filename: DATABASE_FILENAME });
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
			title: "Ship playground-rn-dev",
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
