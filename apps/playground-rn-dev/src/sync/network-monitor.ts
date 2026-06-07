import { type NetworkMonitor, createMutableNetworkMonitor } from "@melon-db/sync";

/** Dev-only mutable network monitor for simulating offline mode in the RN playground. */
export const devNetworkMonitor: NetworkMonitor & {
	setOnline: (online: boolean) => void;
} = createMutableNetworkMonitor(true);
