export type MangoSelector = Record<string, unknown>;

export interface MangoQuery {
	selector: MangoSelector;
	sort?: Array<Record<string, "asc" | "desc">>;
	skip?: number;
	limit?: number;
	fields?: string[];
	/** Result shape: many rows, one row, or count only. Defaults to `many`. */
	mode?: "many" | "one" | "count";
}
