import type { QueryDebugSnapshot } from "@melon-db/db";
import { formatJson } from "./format-json.ts";

/**
 * Returns formatted plan JSON for devtools query inspector.
 */
export function formatQueryPlan(snapshot: QueryDebugSnapshot): string {
	return formatJson(snapshot.plan);
}

/**
 * Returns formatted SQL bind parameters when present.
 */
export function formatQueryParams(snapshot: QueryDebugSnapshot): string | null {
	if (snapshot.params === undefined || snapshot.params.length === 0) {
		return null;
	}
	return formatJson(snapshot.params);
}

/**
 * Whether the snapshot has any SQL-related debug output.
 */
export function hasSqlSection(snapshot: QueryDebugSnapshot): boolean {
	return snapshot.sql !== undefined && snapshot.sql.length > 0;
}
