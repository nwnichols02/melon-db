import {
	type MelonDatabase,
	type StorageAdapter,
	createDatabase,
} from "@melon-db/db";
import { createReactiveDevtoolsBridge } from "@melon-db/db-devtools";
import { Paths } from "expo-file-system";
import { type Task, playgroundMigrations, taskSchema } from "./schema";

const DATABASE_FILENAME = "melon-playground-dev.db";

export const devtoolsBridge = createReactiveDevtoolsBridge();

let databasePromise: Promise<MelonDatabase<typeof taskSchema>> | null = null;

type DatabaseLifecycleListener = () => void;
const databaseResumeListeners = new Set<DatabaseLifecycleListener>();
const databaseSuspendedListeners = new Set<DatabaseLifecycleListener>();

/**
 * Subscribe when the app database is reopened after a native benchmark run.
 */
export function onDatabaseResumed(listener: DatabaseLifecycleListener): () => void {
	databaseResumeListeners.add(listener);
	return () => {
		databaseResumeListeners.delete(listener);
	};
}

/**
 * Subscribe when the app database is closed for native benchmarks.
 */
export function onDatabaseSuspended(
	listener: DatabaseLifecycleListener,
): () => void {
	databaseSuspendedListeners.add(listener);
	return () => {
		databaseSuspendedListeners.delete(listener);
	};
}

function notifyDatabaseResumed(): void {
	for (const listener of databaseResumeListeners) {
		listener();
	}
}

function notifyDatabaseSuspended(): void {
	for (const listener of databaseSuspendedListeners) {
		listener();
	}
}

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
 * Closes the app database so native bench can use the single global SQLite connection.
 * Required for jsi-sync / turbo benchmarks while the main screen is mounted.
 */
export async function suspendDatabaseForNativeBench(): Promise<void> {
	const pending = databasePromise;
	databasePromise = null;
	if (pending) {
		try {
			const db = await pending;
			await db.adapter.close();
		} catch {
			// Bootstrap may have failed; still release the bench slot.
		}
	}
	notifyDatabaseSuspended();
}

/**
 * Reopens the app database after native benchmarks complete.
 */
export async function resumeDatabaseAfterNativeBench(): Promise<
	MelonDatabase<typeof taskSchema>
> {
	const db = await getDatabase();
	notifyDatabaseResumed();
	return db;
}

/**
 * SQLite adapter for playground-rn-dev: native JSI by default, expo-sqlite when
 * EXPO_PUBLIC_MELON_SQLITE=expo.
 */
async function createAdapter(): Promise<StorageAdapter> {
	if (process.env.EXPO_PUBLIC_MELON_SQLITE === "expo") {
		return createExpoAdapter();
	}
	return createNativeAdapter();
}

async function createExpoAdapter(): Promise<StorageAdapter> {
	const SQLite = await import("expo-sqlite");
	const { createExpoSqliteAdapter } = await import("@melon-db/db-sqlite/expo");
	const database = await SQLite.openDatabaseAsync(DATABASE_FILENAME);
	return createExpoSqliteAdapter({ database });
}

async function createNativeAdapter(): Promise<StorageAdapter> {
	const { createJsiSqliteAdapter, isJsiSqliteAvailable } = await import(
		"@melon-db/db-sqlite/rn"
	);
	if (!isJsiSqliteAvailable()) {
		throw new Error(
			"Melon JSI SQLite requires a native binary. " +
				"From apps/playground-rn-dev run: bun run install:ios or bun run install:android, then bun run start",
		);
	}
	const basePath = toFilesystemPath(Paths.document.uri);
	const mode =
		process.env.EXPO_PUBLIC_MELON_SQLITE === "turbo" ? "turbo" : "auto";
	return createJsiSqliteAdapter({
		filename: DATABASE_FILENAME,
		basePath,
		mode,
	});
}

async function bootstrap(): Promise<MelonDatabase<typeof taskSchema>> {
	const db = createDatabase({
		schema: taskSchema,
		adapter: await createAdapter(),
		devtools: devtoolsBridge,
		migrations: playgroundMigrations,
		sync: {},
	});

	const projectCount = await db.collection("projects").count();
	if (projectCount === 0) {
		await seedProjects(db);
	}

	const existing = await db.collection("tasks").count();
	if (existing === 0) {
		await seedTasks(db);
	}

	return db;
}

function toFilesystemPath(uri: string): string {
	if (!uri.startsWith("file://")) {
		return uri;
	}
	return decodeURIComponent(uri.replace(/^file:\/\//, ""));
}

async function seedProjects(
	db: MelonDatabase<typeof taskSchema>,
): Promise<void> {
	await db.write(async (tx) => {
		await tx.collection("projects").insert({
			id: "p-demo",
			name: "Melon demo",
		});
	});
}

async function seedTasks(db: MelonDatabase<typeof taskSchema>): Promise<void> {
	const seeds: Task[] = [
		{
			id: "1",
			title: "Learn Melon",
			status: "open",
			priority: 1,
			projectId: "p-demo",
			updatedAt: new Date(),
		},
		{
			id: "2",
			title: "Ship playground-rn-dev",
			status: "open",
			priority: 2,
			projectId: "p-demo",
			updatedAt: new Date(),
		},
	];

	await db.write(async (tx) => {
		for (const task of seeds) {
			await tx.collection("tasks").insert({ ...task });
		}
	});
}
