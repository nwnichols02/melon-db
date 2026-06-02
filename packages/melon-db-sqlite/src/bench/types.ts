export type BenchEngine =
	| "melon-bun"
	| "melon-node"
	| "melon-jsi-sync"
	| "melon-turbo"
	| "melon-expo"
	| "watermelon"
	| "in-memory";

export interface BenchResult {
	engine: BenchEngine | string;
	scale: number;
	scenario: string;
	durationMs: number;
	rowCount?: number;
	resultCount?: number;
}

export interface BenchSummary {
	results: BenchResult[];
	timestamp: string;
}

export interface CompareRow {
	scenario: string;
	scale: number;
	melonNodeMs: number;
	watermelonMs: number;
	ratio: number;
	winner: "melon" | "watermelon" | "tie";
}

export interface ParityReport {
	timestamp: string;
	scale: number;
	comparisons: CompareRow[];
	raw?: BenchResult[];
	notes: string[];
}

export interface RnCompareRow {
	scenario: string;
	scale: number;
	jsiSyncMs: number;
	turboMs: number;
	ratio: number;
	winner: "jsi-sync" | "turbo" | "tie";
}

export interface RnParityReport {
	timestamp: string;
	scale: number;
	platform: string;
	modes: string[];
	comparisons: RnCompareRow[];
	raw?: BenchResult[];
	notes: string[];
}
