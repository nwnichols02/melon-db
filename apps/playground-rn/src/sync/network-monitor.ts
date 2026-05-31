import { createMutableNetworkMonitor, type NetworkMonitor } from "@melon/sync";

/** Dev-only mutable network monitor for simulating offline mode in the RN playground. */
export const devNetworkMonitor: NetworkMonitor & {
	setOnline: (online: boolean) => void;
} = createMutableNetworkMonitor(true);
