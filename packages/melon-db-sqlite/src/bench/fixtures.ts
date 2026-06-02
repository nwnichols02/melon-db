import { createMelonSchema, predicate, queryAst } from "@melon/db";

export const BATCH_CHUNK_SIZE = 500;

export const benchSchema = createMelonSchema({
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				status: { kind: "string" },
				priority: { kind: "number" },
			},
			indexes: [["status"]],
		},
	},
});

export const filteredQuery = queryAst("tasks", {
	where: predicate("status", "eq", "open"),
	orderBy: [{ field: "priority", direction: "desc" }],
	limit: 20,
});

export const countQuery = queryAst("tasks", {
	mode: "count",
	where: predicate("status", "eq", "open"),
});

/**
 * Builds a task row for benchmark seeding.
 */
export function taskRow(i: number): Record<string, unknown> {
	return {
		id: `task_${i}`,
		status: i % 2 === 0 ? "open" : "closed",
		priority: i % 10,
	};
}
