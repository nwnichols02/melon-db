import type { DevtoolsBridge, QueryDebugSnapshot } from "@melon/db";
import type { AdapterWriteOperation } from "@melon/db";

export interface DevtoolsEventLog {
	queries: QueryDebugSnapshot[];
	writes: AdapterWriteOperation[];
	subscriptions: Array<{ collection: string; active: boolean }>;
	errors: Array<Error & { code?: string }>;
}

/**
 * In-memory devtools bridge for tests and local debugging.
 */
export function createMemoryDevtoolsBridge(): DevtoolsBridge & {
	log: DevtoolsEventLog;
} {
	const log: DevtoolsEventLog = {
		queries: [],
		writes: [],
		subscriptions: [],
		errors: [],
	};

	return {
		log,
		emitQuery(snapshot: QueryDebugSnapshot): void {
			log.queries.push(snapshot);
		},
		emitWrite(operation: AdapterWriteOperation): void {
			log.writes.push(operation);
		},
		emitSubscription(event: { collection: string; active: boolean }): void {
			log.subscriptions.push(event);
		},
		emitError(error: Error & { code?: string }): void {
			log.errors.push(error);
		},
	};
}

/**
 * No-op devtools bridge with zero runtime cost.
 */
export function createNoopDevtoolsBridge(): DevtoolsBridge {
	return {
		emitQuery(): void {},
		emitWrite(): void {},
		emitSubscription(): void {},
		emitError(): void {},
	};
}
