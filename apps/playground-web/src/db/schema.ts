import { createMelonSchema } from "@melon/db";

export interface Task extends Record<string, unknown> {
	id: string;
	title: string;
	status: string;
}

export const taskSchema = createMelonSchema({
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				title: { kind: "string" },
				status: { kind: "string" },
			},
		},
	},
});
