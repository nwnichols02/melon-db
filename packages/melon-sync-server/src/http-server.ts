import { SyncServerError, SyncServerErrorCode } from "./errors.ts";
import type { InMemorySyncStore } from "./store.ts";
import { InMemorySyncStore as StoreClass } from "./store.ts";
import {
	validatePullBody,
	validatePullResultTimestamp,
	validatePushBody,
} from "./validators.ts";

export interface CreateSyncHttpServerOptions {
	port?: number;
	hostname?: string;
	store?: InMemorySyncStore;
	collection?: string;
	maxSchemaVersion?: number;
}

export interface SyncHttpServer {
	server: ReturnType<typeof Bun.serve>;
	store: InMemorySyncStore;
	url: string;
	stop: () => void;
}

function corsHeaders(): Record<string, string> {
	return {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
	};
}

function jsonResponse(body: unknown, status = 200): Response {
	return Response.json(body, { status, headers: corsHeaders() });
}

function errorResponse(error: unknown): Response {
	if (error instanceof SyncServerError) {
		return jsonResponse(
			{ error: error.message, code: error.code },
			error.status,
		);
	}
	return jsonResponse({ error: "Internal server error" }, 500);
}

async function readJson(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		throw new SyncServerError("Invalid JSON body", {
			code: SyncServerErrorCode.INVALID_PAYLOAD,
		});
	}
}

/**
 * Creates a Bun HTTP server exposing Watermelon-compatible sync endpoints.
 */
export function createSyncHttpServer(
	options: CreateSyncHttpServerOptions = {},
): SyncHttpServer {
	const port = options.port ?? 8787;
	const hostname = options.hostname ?? "0.0.0.0";
	const maxSchemaVersion = options.maxSchemaVersion ?? 1;
	const store =
		options.store ??
		new StoreClass({ collection: options.collection ?? "tasks" });

	const server = Bun.serve({
		hostname,
		port,
		async fetch(request) {
			const url = new URL(request.url);

			if (request.method === "OPTIONS") {
				return new Response(null, { status: 204, headers: corsHeaders() });
			}

			try {
				if (request.method === "POST" && url.pathname === "/sync/pull") {
					const body = await readJson(request);
					const args = validatePullBody(body, { maxSchemaVersion });
					const result = await store.pullChanges(args);
					const timestamp = validatePullResultTimestamp(result.timestamp);
					return jsonResponse({
						changes: result.changes,
						timestamp,
						schemaVersion: maxSchemaVersion,
					});
				}

				if (request.method === "POST" && url.pathname === "/sync/push") {
					const body = await readJson(request);
					const args = validatePushBody(body);
					await store.pushChanges(args);
					return new Response(null, { status: 204, headers: corsHeaders() });
				}

				return jsonResponse({ error: "Not found" }, 404);
			} catch (error) {
				return errorResponse(error);
			}
		},
	});

	const host =
		hostname === "0.0.0.0" || hostname === "127.0.0.1" ? "localhost" : hostname;
	const url = `http://${host}:${server.port}`;

	return {
		server,
		store,
		url,
		stop: () => server.stop(),
	};
}
