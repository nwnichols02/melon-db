export {
	parseQueryDescription,
	queryDescriptionToAst,
	translateWatermelonQuery,
} from "./compat/translate-query.ts";

export type {
	WatermelonQueryClause,
	WatermelonWhereClause,
	WatermelonAndClause,
	WatermelonOrClause,
	WatermelonSortByClause,
	WatermelonSkipClause,
	WatermelonTakeClause,
	WatermelonOnClause,
} from "./compat/types.ts";

export {
	WATERMELON_OPERATOR_MAP,
	mapWatermelonOperator,
	type WatermelonOperatorName,
} from "./compat/operator-map.ts";

export {
	CODEMOD_IGNORE,
	type CodemodOptions,
	type CodemodResult,
	runCodemod,
	createInMemoryProject,
	normalizeCode,
	shouldIgnoreFile,
	collectSourceFiles,
} from "./codemods/runner.ts";

export {
	migrateQueries,
	applyMigrateQueriesTransform,
} from "./codemods/migrate-queries.ts";

export {
	migrateWrites,
	applyMigrateWritesTransform,
} from "./codemods/migrate-writes.ts";

export {
	migrateReact,
	applyMigrateReactTransform,
} from "./codemods/migrate-react.ts";
