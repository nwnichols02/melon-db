export type MangoSelector = Record<string, unknown>;

export interface MangoQuery {
	selector: MangoSelector;
	sort?: Array<Record<string, "asc" | "desc">>;
	skip?: number;
	limit?: number;
	fields?: string[];
}
