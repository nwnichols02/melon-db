import {
	type ReactElement,
	type ReactNode,
	createContext,
	useContext,
	useSyncExternalStore,
} from "react";
import type {
	DevtoolsEventLog,
	ReactiveDevtoolsBridge,
} from "../reactive-bridge.ts";

export interface MelonDevtoolsContextValue {
	bridge: ReactiveDevtoolsBridge;
	log: DevtoolsEventLog;
}

const DevtoolsContext = createContext<MelonDevtoolsContextValue | null>(null);

export interface MelonDevtoolsProviderProps {
	bridge: ReactiveDevtoolsBridge;
	children: ReactNode;
}

/**
 * Provides reactive devtools event log to inspector UI components.
 */
export function MelonDevtoolsProvider({
	bridge,
	children,
}: MelonDevtoolsProviderProps): ReactElement {
	const log = useSyncExternalStore(
		bridge.subscribe,
		bridge.getSnapshot,
		bridge.getSnapshot,
	);

	return (
		<DevtoolsContext.Provider value={{ bridge, log }}>
			{children}
		</DevtoolsContext.Provider>
	);
}

/**
 * Returns devtools bridge and current event log snapshot.
 */
export function useMelonDevtools(): MelonDevtoolsContextValue {
	const context = useContext(DevtoolsContext);
	if (!context) {
		throw new Error(
			"useMelonDevtools must be used within MelonDevtoolsProvider",
		);
	}
	return context;
}
