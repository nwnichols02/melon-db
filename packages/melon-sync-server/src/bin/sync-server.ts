#!/usr/bin/env bun
import { createSyncHttpServer } from "../http-server.ts";
import { createPostgresSyncStore } from "../postgres-store.ts";
import { InMemorySyncStore } from "../store.ts";

const port = Number(process.env.PORT ?? 8787);
const databaseUrl = process.env.DATABASE_URL;

function printPostgresSetupHelp(error: unknown): void {
	console.error("\nFailed to connect to Postgres.");
	if (error instanceof Error && error.message) {
		console.error(`  ${error.message}`);
	}
	console.error("\nStart the reference database:");
	console.error("  bun run postgres:up");
	console.error("\nThen retry:");
	console.error("  bun run sync-server:postgres");
	console.error("\nDefault URL (Docker on port 5433):");
	console.error("  postgres://melon:melon@localhost:5433/melon_sync");
	console.error(
		"\nIf you see 'role \"melon\" does not exist', port 5432 is likely your system Postgres — use bun run postgres:up (port 5433).",
	);
}

let store:
	| Awaited<ReturnType<typeof createPostgresSyncStore>>
	| InMemorySyncStore;

try {
	store = databaseUrl
		? await createPostgresSyncStore(databaseUrl)
		: new InMemorySyncStore();
} catch (error) {
	if (databaseUrl) {
		printPostgresSetupHelp(error);
	}
	throw error;
}

let serverHandle: ReturnType<typeof createSyncHttpServer>;

try {
	serverHandle = createSyncHttpServer({ port, store });
} catch (error) {
	const isAddrInUse =
		error instanceof Error &&
		("code" in error
			? (error as Error & { code?: string }).code === "EADDRINUSE"
			: error.message.includes("EADDRINUSE") ||
				(error.message.includes("port") && error.message.includes("in use")));

	if (isAddrInUse) {
		console.error(`\nPort ${port} is already in use.`);
		console.error(
			"\nStop the existing sync-server (Ctrl+C in its terminal), or run:",
		);
		console.error(`  PORT=${port + 1} bun run sync-server:postgres`);
		console.error("\nTo find the process:");
		console.error(`  lsof -i :${port}`);
	}

	throw error;
}

const { url, stop } = serverHandle;

console.log(`@melon/sync-server listening at ${url}`);
console.log(`Store: ${databaseUrl ? "postgres" : "in-memory"}`);
console.log("  POST /sync/pull");
console.log("  POST /sync/push");

process.on("SIGINT", () => {
	stop();
	process.exit(0);
});
