import type { AdapterWriteOperation } from "./adapter.ts";
import type { PreparedQuery, QueryAst, QueryPlan } from "./ast.ts";

export interface QueryDebugSnapshot {
	source: PreparedQuery["source"];
	input: unknown;
	ast: QueryAst;
	plan: QueryPlan;
	sql?: string;
	durationMs?: number;
}

export const SyncDebugPhase = {
	Pull: "pull",
	Apply: "apply",
	Push: "push",
	Checkpoint: "checkpoint",
	Complete: "complete",
	Failed: "failed",
} as const;

export type SyncDebugPhase =
	(typeof SyncDebugPhase)[keyof typeof SyncDebugPhase];

export interface SyncDebugSnapshot {
	phase: SyncDebugPhase;
	lastPulledAt: number | null;
	timestamp: number;
	changesSummary?: Record<
		string,
		{ created: number; updated: number; deleted: number }
	>;
	error?: { code?: string; message: string; retryable?: boolean };
	durationMs?: number;
}

export interface DevtoolsBridge {
	emitQuery(snapshot: QueryDebugSnapshot): void;
	emitWrite(operation: AdapterWriteOperation): void;
	emitSubscription(event: { collection: string; active: boolean }): void;
	emitError(error: Error & { code?: string }): void;
	emitSync?(snapshot: SyncDebugSnapshot): void;
}
