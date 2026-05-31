import { describe, expect, test } from "bun:test";
import {
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
} from "@melon/db";
import { createMemoryCheckpointStore, synchronize } from "@melon/sync";
import { createSyncHttpServer } from "../src/http-server.ts";

const syncSchema = createMelonSchema({
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				title: { kind: "string" },
				status: { kind: "string" },
			},
		},
	},
});

describe("createSyncHttpServer", () => {
	test("HTTP pull/push roundtrip with two clients", async () => {
		const { url, stop } = createSyncHttpServer({ port: 0 });
		try {
			const clientA = createDatabase({
				schema: syncSchema,
				adapter: createInMemoryAdapter(),
				sync: {},
			});
			const clientB = createDatabase({
				schema: syncSchema,
				adapter: createInMemoryAdapter(),
				sync: {},
			});

			await clientA.write(async (tx) => {
				await tx.collection("tasks").insert({
					id: "1",
					title: "HTTP sync",
					status: "open",
				});
			});

			const backend = createHttpBackend(url);

			await synchronize({
				db: clientA,
				...backend,
				checkpointStore: createMemoryCheckpointStore(),
			});

			await synchronize({
				db: clientB,
				...backend,
				checkpointStore: createMemoryCheckpointStore(),
			});

			const task = await clientB.collection("tasks").findById("1");
			expect(task?.title).toBe("HTTP sync");
		} finally {
			stop();
		}
	});

	test("returns 400 for invalid pull payload", async () => {
		const { url, stop } = createSyncHttpServer({ port: 0 });
		try {
			const response = await fetch(`${url}/sync/pull`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ lastPulledAt: null }),
			});
			expect(response.status).toBe(400);
		} finally {
			stop();
		}
	});

	test("handles CORS preflight", async () => {
		const { url, stop } = createSyncHttpServer({ port: 0 });
		try {
			const response = await fetch(`${url}/sync/pull`, { method: "OPTIONS" });
			expect(response.status).toBe(204);
			expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
		} finally {
			stop();
		}
	});
});

function createHttpBackend(baseUrl: string) {
	return {
		pullChanges: async (args: {
			lastPulledAt: number | null;
			schemaVersion: number;
		}) => {
			const response = await fetch(`${baseUrl}/sync/pull`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(args),
			});
			if (!response.ok) {
				throw new Error(`Pull failed: ${response.status}`);
			}
			return response.json() as Promise<{
				changes: import("@melon/db").SyncChanges;
				timestamp: number;
			}>;
		},
		pushChanges: async (args: {
			changes: import("@melon/db").SyncChanges;
			lastPulledAt: number;
		}) => {
			const response = await fetch(`${baseUrl}/sync/push`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(args),
			});
			if (!response.ok) {
				throw new Error(`Push failed: ${response.status}`);
			}
		},
	};
}
