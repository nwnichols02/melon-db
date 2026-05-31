import type {
	AdapterWriteOperation,
	DevtoolsBridge,
	QueryDebugSnapshot,
	SyncDebugSnapshot,
} from "@melon/db";
import type { DevtoolsEventLog } from "./bridge.ts";

export type { DevtoolsEventLog };

export interface ReactiveDevtoolsBridge extends DevtoolsBridge {
	readonly log: DevtoolsEventLog;
	subscribe(listener: () => void): () => void;
	getSnapshot(): DevtoolsEventLog;
	clear(): void;
	emitSync(snapshot: SyncDebugSnapshot): void;
}

export interface ReactiveDevtoolsBridgeOptions {
	maxQueries?: number;
	maxWrites?: number;
	maxSync?: number;
	maxSubscriptions?: number;
	maxErrors?: number;
}

const DEFAULT_MAX = 100;

function pushRing<T>(buffer: T[], item: T, max: number): void {
	buffer.push(item);
	if (buffer.length > max) {
		buffer.shift();
	}
}

/**
 * Creates a devtools bridge with ring-buffered event logs and subscribe API for React panels.
 */
export function createReactiveDevtoolsBridge(
	options?: ReactiveDevtoolsBridgeOptions,
): ReactiveDevtoolsBridge {
	const maxQueries = options?.maxQueries ?? DEFAULT_MAX;
	const maxWrites = options?.maxWrites ?? DEFAULT_MAX;
	const maxSync = options?.maxSync ?? DEFAULT_MAX;
	const maxSubscriptions = options?.maxSubscriptions ?? DEFAULT_MAX;
	const maxErrors = options?.maxErrors ?? DEFAULT_MAX;

	const listeners = new Set<() => void>();
	const log: DevtoolsEventLog = {
		queries: [],
		writes: [],
		subscriptions: [],
		errors: [],
		sync: [],
	};

	const notify = (): void => {
		for (const listener of listeners) {
			listener();
		}
	};

	return {
		log,

		subscribe(listener: () => void): () => void {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},

		getSnapshot(): DevtoolsEventLog {
			return log;
		},

		clear(): void {
			log.queries.length = 0;
			log.writes.length = 0;
			log.subscriptions.length = 0;
			log.errors.length = 0;
			log.sync.length = 0;
			notify();
		},

		emitQuery(snapshot: QueryDebugSnapshot): void {
			pushRing(log.queries, snapshot, maxQueries);
			notify();
		},

		emitWrite(operation: AdapterWriteOperation): void {
			pushRing(log.writes, operation, maxWrites);
			notify();
		},

		emitSubscription(event: { collection: string; active: boolean }): void {
			pushRing(log.subscriptions, event, maxSubscriptions);
			notify();
		},

		emitError(error: Error & { code?: string }): void {
			pushRing(log.errors, error, maxErrors);
			notify();
		},

		emitSync(snapshot: SyncDebugSnapshot): void {
			pushRing(log.sync, snapshot, maxSync);
			notify();
		},
	};
}
