/**
 * Headless network status contract for sync orchestration.
 */
export interface NetworkMonitor {
	isOnline(): boolean | Promise<boolean>;
	subscribe(onChange: (online: boolean) => void): () => void;
}

/**
 * Returns a monitor that always reports online (default for tests and server usage).
 */
export function createAlwaysOnlineMonitor(): NetworkMonitor {
	return {
		isOnline: () => true,
		subscribe: () => () => {},
	};
}

/**
 * Returns a monitor backed by a mutable online flag (useful for demos and tests).
 */
export function createMutableNetworkMonitor(
	initialOnline = true,
): NetworkMonitor & {
	setOnline: (online: boolean) => void;
} {
	let online = initialOnline;
	const listeners = new Set<(value: boolean) => void>();

	return {
		isOnline: () => online,
		subscribe(onChange) {
			listeners.add(onChange);
			return () => listeners.delete(onChange);
		},
		setOnline(value: boolean) {
			if (online === value) {
				return;
			}
			online = value;
			for (const listener of listeners) {
				listener(value);
			}
		},
	};
}
