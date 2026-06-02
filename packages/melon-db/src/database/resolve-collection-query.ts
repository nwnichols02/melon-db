import type { QueryAst } from "../ast.ts";
import { QueryBuilder } from "@melon/db-query";
import type { CollectionQueryInput } from "./query-input.ts";

export function resolveCollectionQueryInput<RecordShape = Record<string, unknown>>(
	collection: string,
	input: QueryAst | CollectionQueryInput<RecordShape> | undefined,
	defaultAst: () => QueryAst,
): QueryAst {
	if (input === undefined) return defaultAst();
	if (typeof input !== "function") return input;

	// Thunk input: () => QueryAst
	if (input.length === 0) return (input as () => QueryAst)();

	// Fluent builder callback input: (builder) => builder
	// (implemented by @melon/db-query QueryBuilder but typed structurally here).
	const builder = new QueryBuilder<RecordShape>(collection);
	const built = (
		input as (b: import("./query-input.ts").QueryBuilderLike<RecordShape>) => unknown
	)(builder);

	if (built && typeof built === "object" && "toAst" in built) {
		return (built as { toAst: (mode?: QueryAst["mode"]) => QueryAst }).toAst(
			defaultAst().mode,
		);
	}

	return builder.toAst(defaultAst().mode);
}
