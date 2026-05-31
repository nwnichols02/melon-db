import {
	type CreateDatabaseOptions,
	type DatabaseSchemaDefinition,
	type MelonDatabase,
	type MelonSchema,
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
} from "@melon/db";

export interface TestDatabaseContext {
	db: MelonDatabase;
	schema: MelonSchema;
}

/**
 * Runs a test function with an ephemeral in-memory database.
 */
export async function withTestDatabase<T>(
	definition: DatabaseSchemaDefinition,
	fn: (ctx: TestDatabaseContext) => Promise<T>,
): Promise<T> {
	const schema = createMelonSchema(definition);
	const options: CreateDatabaseOptions = {
		schema,
		adapter: createInMemoryAdapter(),
	};
	const db = createDatabase(options);
	try {
		return await fn({ db, schema });
	} finally {
		await db.unsafeReset();
		await db.adapter.close();
	}
}
