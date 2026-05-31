#!/usr/bin/env bun
import { migrateQueries } from "../codemods/migrate-queries.ts";
import { migrateReact } from "../codemods/migrate-react.ts";
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
		"Usage: melon-codemod <migrate-queries|migrate-writes|migrate-react> --path=./src [--dry-run] [--db-var=db] [--source-var=database]",
	);
	process.exit(1);
}

const options = { path, dryRun, dbVar, sourceVar };

let result: CodemodResult;
if (command === "migrate-queries") {
	result = migrateQueries(options);
} else if (command === "migrate-writes") {
	result = migrateWrites(options);
} else if (command === "migrate-react") {
	result = migrateReact(options);
} else {
	console.error(`Unknown command: ${command ?? "(none)"}`);
	console.error("Commands: migrate-queries, migrate-writes, migrate-react");
	process.exit(1);
}

console.log(
	`${dryRun ? "[dry-run] " : ""}Changed ${result.filesChanged} file(s)`,
);
for (const warning of result.warnings) {
	console.warn(`  warn: ${warning}`);
}
for (const error of result.errors) {
	console.error(`  error: ${error}`);
}

if (result.errors.length > 0) {
	process.exit(1);
}
