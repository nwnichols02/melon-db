import type { NetworkMonitor } from "@melon/sync";

/**
 * Creates a network monitor that pings a URL and falls back to navigator.onLine on web.
 */
export function createFetchNetworkMonitor(
	baseUrl: string,
	options?: { intervalMs?: number },
): NetworkMonitor {
	const listeners = new Set<(online: boolean) => void>();
	let online = true;
	let interval: ReturnType<typeof setInterval> | undefined;

	async function probe(): Promise<boolean> {
		if (
			typeof globalThis.navigator !== "undefined" &&
			"onLine" in globalThis.navigator &&
			globalThis.navigator.onLine === false
		) {
			return false;
		}
		try {
			const response = await fetch(baseUrl, { method: "HEAD" });
			return response.ok || response.status < 500;
		} catch {
			return false;
		}
	}

	async function refresh(): Promise<void> {
		const next = await probe();
		if (next === online) {
			return;
		}
		online = next;
		for (const listener of listeners) {
			listener(next);
		}
	}

	return {
		isOnline: () => online,
		subscribe(onChange) {
			listeners.add(onChange);
			if (listeners.size === 1) {
				void refresh();
				interval = setInterval(() => {
					void refresh();
				}, options?.intervalMs ?? 5000);
			}
			return () => {
				listeners.delete(onChange);
				if (listeners.size === 0 && interval) {
					clearInterval(interval);
					interval = undefined;
				}
			};
		},
	};
}
