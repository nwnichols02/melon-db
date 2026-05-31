#!/usr/bin/env bun
import { runGenerateCommand } from "../cli/generate-cmd.ts";
import { runImportCommand } from "../cli/import-cmd.ts";

function readArg(name: string): string | undefined {
	const prefix = `--${name}=`;
	const match = process.argv.find((arg) => arg.startsWith(prefix));
	return match?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
	return process.argv.includes(`--${name}`);
}

const command = process.argv[2];

if (command === "import") {
	const schemaPath = readArg("schema");
	if (!schemaPath) {
		console.error("Usage: melon-prisma import --schema=./schema.prisma");
		process.exit(1);
	}
	await runImportCommand(schemaPath);
	process.exit(0);
}

if (command === "generate") {
	const schemaPath = readArg("schema");
	const outputPath = readArg("out") ?? "./generated/melon";
	if (!schemaPath) {
		console.error(
			"Usage: melon-prisma generate --schema=./schema.prisma [--out=./generated/melon] [--emit-hooks]",
		);
		process.exit(1);
	}
	await runGenerateCommand({
		schemaPath,
		outputPath,
		emitHooks: hasFlag("emit-hooks"),
	});
	console.log(`Generated Melon client at ${outputPath}`);
	process.exit(0);
}

console.error("Usage: melon-prisma <import|generate> [options]");
process.exit(1);
