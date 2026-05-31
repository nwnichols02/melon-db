#!/usr/bin/env bun
import { createSyncHttpServer } from "../http-server.ts";

const port = Number(process.env.PORT ?? 8787);
const { url, stop } = createSyncHttpServer({ port });

console.log(`@melon/sync-server listening at ${url}`);
console.log("  POST /sync/pull");
console.log("  POST /sync/push");

process.on("SIGINT", () => {
	stop();
	process.exit(0);
});
