#!/usr/bin/env bun
import { migrateQueries } from "../codemods/migrate-queries.ts";
import { migrateReact } from "../codemods/migrate-react.ts";
import {
	formatSchemaOutput,
	migrateSchema,
} from "../codemods/migrate-schema.ts";
import { migrateWrites } from "../codemods/migrate-writes.ts";
import type { CodemodResult } from "../codemods/runner.ts";

function readArg(name: string): string | undefined {
	const prefix = `--${name}=`;
	const match = process.argv.find((arg) => arg.startsWith(prefix));
	return match?.slice(prefix.length);
}

function hasFlag(name: string): boolean {
	return process.argv.includes(`--${name}`);
}

const command = process.argv[2];
const path = readArg("path");
const dryRun = hasFlag("dry-run");
const dbVar = readArg("db-var") ?? "db";
const sourceVar = readArg("source-var") ?? "database";

if (!path) {
	console.error(
		"Usage: melon-codemod <migrate-queries|migrate-writes|migrate-react|migrate-schema> --path=<dir|file> [--dry-run]",
	);
	console.error("");
	console.error("Examples (from monorepo root):");
	console.error(
		"  bun run melon-codemod migrate-writes --path=apps/playground-rn/src --dry-run",
	);
	console.error(
		"  bun run melon-codemod migrate-schema --path=src/models/Task.ts",
	);
	process.exit(1);
}

let result: CodemodResult;
try {
	const options = { path, dryRun, dbVar, sourceVar };
	if (command === "migrate-queries") {
		result = migrateQueries(options);
	} else if (command === "migrate-writes") {
		result = migrateWrites(options);
	} else if (command === "migrate-react") {
		result = migrateReact(options);
	} else if (command === "migrate-schema") {
		const { result: schemaResult, schemas } = migrateSchema(options);
		result = schemaResult;
		for (const schema of schemas) {
			console.log(formatSchemaOutput(schema));
		}
		if (schemas.length === 0) {
			console.error("No Model classes found to extract.");
			process.exit(1);
		}
	} else {
		console.error(`Unknown command: ${command ?? "(none)"}`);
		console.error(
			"Commands: migrate-queries, migrate-writes, migrate-react, migrate-schema",
		);
		process.exit(1);
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}

if (command !== "migrate-schema") {
	console.log(
		`${dryRun ? "[dry-run] " : ""}Changed ${result.filesChanged} file(s)`,
	);
}
for (const warning of result.warnings) {
	console.warn(`  warn: ${warning}`);
}
for (const error of result.errors) {
	console.error(`  error: ${error}`);
}

if (result.errors.length > 0) {
	process.exit(1);
}
