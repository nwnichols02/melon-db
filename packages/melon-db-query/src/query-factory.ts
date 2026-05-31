import type { MelonSchema } from "@melon/db";
import { QueryBuilder } from "./query-builder.ts";

export interface QueryFactory {
	from<RecordShape>(collection: string): QueryBuilder<RecordShape>;
}

/**
 * Creates a typed query factory for a schema.
 */
export function createQueryFactory(_schema: MelonSchema): QueryFactory {
	return {
		from<RecordShape>(collection: string): QueryBuilder<RecordShape> {
			return new QueryBuilder<RecordShape>(collection);
		},
	};
}
