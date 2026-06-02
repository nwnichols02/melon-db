import type { MangoQuery } from "./types.ts";

/**
 * Normalizes a Mango query for stable serialization and compilation.
 */
export function normalizeMangoQuery(query: MangoQuery): MangoQuery {
	const normalized: MangoQuery = {
		selector: { ...query.selector },
		mode: query.mode ?? "many",
	};
	if (query.sort) {
		normalized.sort = query.sort.map((entry) => ({ ...entry }));
	}
	if (query.skip !== undefined) {
		normalized.skip = query.skip;
	}
	if (query.limit !== undefined) {
		normalized.limit = query.limit;
	}
	if (query.fields) {
		normalized.fields = [...query.fields];
	}
	return normalized;
}

export interface MangoNormalizer {
	normalize(query: MangoQuery): MangoQuery;
}

/**
 * Creates a Mango query normalizer.
 */
export function createMangoNormalizer(): MangoNormalizer {
	return { normalize: normalizeMangoQuery };
}
