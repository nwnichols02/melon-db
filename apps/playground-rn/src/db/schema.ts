import { type DatabaseSchemaDefinition, createMelonSchema } from "@melon/db";

export const taskSchemaDefinition: DatabaseSchemaDefinition = {
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				title: { kind: "string" },
				status: { kind: "string", indexed: true },
				priority: { kind: "number" },
				updatedAt: { kind: "date" },
			},
			indexes: [["status"], ["updatedAt"]],
		},
	},
};

export const taskSchema = createMelonSchema(taskSchemaDefinition);

export interface Task extends Record<string, unknown> {
	id: string;
	title: string;
	status: string;
	priority: number;
	updatedAt: Date;
}
