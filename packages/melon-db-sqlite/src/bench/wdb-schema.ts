import { Model, appSchema, tableSchema } from "@nozbe/watermelondb";

/**
 * Minimal Watermelon model for benchmark tasks (no decorators).
 */
export class BenchTask extends Model {
	static override table = "tasks";
}

export const wdbAppSchema = appSchema({
	version: 1,
	tables: [
		tableSchema({
			name: "tasks",
			columns: [
				{ name: "status", type: "string" },
				{ name: "priority", type: "number", isOptional: true },
			],
		}),
	],
});
