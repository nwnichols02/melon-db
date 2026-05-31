import { predicate, queryAst } from "../src/ast.ts";
import type { QueryAst } from "../src/ast.ts";
import { taskSchemaDefinition } from "./task-schema.ts";

export const adapterCrudSchemaDefinition = taskSchemaDefinition;

export interface TaskSeed extends Record<string, unknown> {
	id: string;
	title: string;
	status: string;
	priority: number;
	updatedAt: Date;
}

export const filterSortLimitQuery: QueryAst = queryAst("tasks", {
	where: predicate("status", "eq", "open"),
	orderBy: [{ field: "priority", direction: "desc" }],
	limit: 1,
});

export const filterSortLimitSeeds: TaskSeed[] = [
	{
		id: "a",
		title: "A",
		status: "open",
		priority: 3,
		updatedAt: new Date("2024-02-01"),
	},
	{
		id: "b",
		title: "B",
		status: "open",
		priority: 1,
		updatedAt: new Date("2024-03-01"),
	},
	{
		id: "c",
		title: "C",
		status: "closed",
		priority: 5,
		updatedAt: new Date("2024-01-01"),
	},
];

export const insertFindUpdateDeleteSeed: TaskSeed = {
	id: "t1",
	title: "First",
	status: "open",
	priority: 1,
	updatedAt: new Date("2024-01-01"),
};
