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
}

const DevtoolsContext = createContext<MelonDevtoolsContextValue | null>(null);

export interface MelonDevtoolsProviderProps {
	bridge: ReactiveDevtoolsBridge;
	children: ReactNode;
}

/**
 * Provides the devtools bridge without subscribing app children to query events.
 * Use {@link useMelonDevtoolsLog} in inspector UI so list screens do not re-render on every query.
 */
export function MelonDevtoolsProvider({
	bridge,
	children,
}: MelonDevtoolsProviderProps): ReactElement {
	return (
		<DevtoolsContext.Provider value={{ bridge }}>
			{children}
		</DevtoolsContext.Provider>
	);
}

/**
 * Returns the devtools bridge (stable; does not subscribe to the event log).
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

/**
 * Subscribes to the reactive devtools event log. Use only in inspector UI, not on data screens.
 */
export function useMelonDevtoolsLog(): DevtoolsEventLog {
	const { bridge } = useMelonDevtools();
	return useSyncExternalStore(
		bridge.subscribe,
		bridge.getSnapshot,
		bridge.getSnapshot,
	);
}
