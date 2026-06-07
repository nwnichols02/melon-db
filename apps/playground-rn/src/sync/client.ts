import type { PullArgs, PullResult, PushArgs } from "@melon-db/sync";
import { Platform } from "react-native";

const DEFAULT_PORT = 8787;

/**
 * Resolves the sync server base URL for the current platform.
 */
export function getSyncBaseUrl(port = DEFAULT_PORT): string {
	if (Platform.OS === "android") {
		return `http://10.0.2.2:${port}`;
	}
	return `http://localhost:${port}`;
}

/**
 * Creates HTTP pull/push callbacks for MelonSyncProvider.
 */
export function createHttpSyncBackend(baseUrl = getSyncBaseUrl()) {
	return {
		pullChanges: async (args: PullArgs): Promise<PullResult> => {
			const response = await fetch(`${baseUrl}/sync/pull`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(args),
			});
			if (!response.ok) {
				const body = await response.text();
				throw new Error(`Sync pull failed (${response.status}): ${body}`);
			}
			return response.json() as Promise<PullResult>;
		},
		pushChanges: async (args: PushArgs): Promise<void> => {
			const response = await fetch(`${baseUrl}/sync/push`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(args),
			});
			if (!response.ok) {
				const body = await response.text();
				throw new Error(`Sync push failed (${response.status}): ${body}`);
			}
		},
	};
}
