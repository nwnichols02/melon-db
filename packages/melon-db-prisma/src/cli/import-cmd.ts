import { readFile } from "node:fs/promises";
import { importPrismaSchema } from "../importer/import-schema.ts";

/**
 * Prints imported schema JSON to stdout.
 */
export async function runImportCommand(schemaPath: string): Promise<void> {
	const text = await readFile(schemaPath, "utf8");
	const definition = await importPrismaSchema(text);
	console.log(JSON.stringify(definition, null, 2));
}
