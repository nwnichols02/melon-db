import { describe, expect, test } from "bun:test";
import { taskSchemaDefinition } from "../__fixtures__/task-schema.ts";
import { MelonError } from "../src/errors.ts";
import { createMelonSchema } from "../src/schema.ts";

describe("createMelonSchema", () => {
	test("builds schema from definition", () => {
		const schema = createMelonSchema(taskSchemaDefinition);
		expect(schema.version).toBe(1);
		expect(schema.getCollection("tasks").primaryKey).toBe("id");
	});

	test("rejects duplicate collection keys", () => {
		expect(() =>
			createMelonSchema({
				version: 1,
				collections: {
					a: { name: "a", fields: {} },
					b: { name: "a", fields: {} },
				},
			}),
		).toThrow(MelonError);
	});

	test("rejects invalid relation target", () => {
		expect(() =>
			createMelonSchema({
				version: 1,
				collections: {
					tasks: {
						name: "tasks",
						fields: { id: { kind: "string" } },
						relations: {
							project: {
								kind: "belongsTo",
								target: "missing",
								foreignKey: "projectId",
							},
						},
					},
				},
			}),
		).toThrow(MelonError);
	});
});
