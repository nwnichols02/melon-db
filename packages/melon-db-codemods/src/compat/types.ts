import type { QueryOperator } from "@melon/db";

export interface WatermelonWhereClause {
	type: "where";
	field: string;
	op?: QueryOperator;
	value?: unknown;
}

export interface WatermelonAndClause {
	type: "and";
	clauses: WatermelonQueryClause[];
}

export interface WatermelonOrClause {
	type: "or";
	clauses: WatermelonQueryClause[];
}

export interface WatermelonSortByClause {
	type: "sortBy";
	field: string;
	direction: "asc" | "desc";
}

export interface WatermelonSkipClause {
	type: "skip";
	count: number;
}

export interface WatermelonTakeClause {
	type: "take";
	count: number;
}

export interface WatermelonOnClause {
	type: "on";
	table: string;
	condition?: unknown;
}

export interface WatermelonExperimentalJoinClause {
	type: "experimentalJoinTables";
	tables: string[];
}

export interface WatermelonExperimentalNestedJoinClause {
	type: "experimentalNestedJoin";
	table: string;
	nestedTable: string;
}

export type WatermelonQueryClause =
	| WatermelonWhereClause
	| WatermelonAndClause
	| WatermelonOrClause
	| WatermelonSortByClause
	| WatermelonSkipClause
	| WatermelonTakeClause
	| WatermelonOnClause
	| WatermelonExperimentalJoinClause
	| WatermelonExperimentalNestedJoinClause;
