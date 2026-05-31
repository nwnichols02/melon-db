import { readFile } from "node:fs/promises";
import { generateClient } from "../codegen/generate-client.ts";
import { importPrismaSchema } from "../importer/import-schema.ts";

export interface GenerateCommandOptions {
	schemaPath: string;
	outputPath: string;
	emitHooks?: boolean;
}

/**
 * Generates a local Melon client from a Prisma schema file.
 */
export async function runGenerateCommand(
	options: GenerateCommandOptions,
): Promise<void> {
	const text = await readFile(options.schemaPath, "utf8");
	const definition = await importPrismaSchema(text);
	await generateClient(definition, {
		outputPath: options.outputPath,
		emitHooks: options.emitHooks,
	});
}
