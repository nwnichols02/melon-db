import { type DatabaseSchemaDefinition, createMelonSchema } from "@melon-db/db";

export const taskSchemaDefinition: DatabaseSchemaDefinition = {
	version: 2,
	collections: {
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
	},
};

export const playgroundMigrations = [
	{
		toVersion: 1,
		steps: [{ type: "createTable" as const, collection: "tasks" }],
	},
	{
		toVersion: 2,
		steps: [
			{ type: "createTable" as const, collection: "projects" },
			{
				type: "addColumns" as const,
				collection: "tasks",
				fields: { projectId: { kind: "string" as const, nullable: true } },
			},
		],
	},
];

export const taskSchema = createMelonSchema(taskSchemaDefinition);

export interface Project extends Record<string, unknown> {
	id: string;
	name: string;
	tasks?: Task[];
}

export interface Task extends Record<string, unknown> {
	id: string;
	title: string;
	status: string;
	priority: number;
	projectId?: string | null;
	updatedAt: Date;
	project?: Project | null;
}
