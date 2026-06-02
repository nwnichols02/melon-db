import {
	type DatabaseSchemaDefinition,
	createMelonSchema,
} from "../src/schema.ts";

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
				projectId: { kind: "string", nullable: true },
				updatedAt: { kind: "date" },
			},
			relations: {
				project: {
					kind: "belongsTo",
					target: "projects",
					foreignKey: "projectId",
				},
			},
			indexes: [["status"], ["updatedAt"]],
		},
		projects: {
			name: "projects",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				name: { kind: "string" },
			},
			relations: {
				tasks: {
					kind: "hasMany",
					target: "tasks",
					foreignKey: "projectId",
				},
			},
		},
	},
};

export const taskSchema = createMelonSchema(taskSchemaDefinition);
