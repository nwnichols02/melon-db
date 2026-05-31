import type { FieldDefinition, MelonSchema } from "../schema.ts";
import type { MigrationStep, MigrationStepExecutor } from "./types.ts";

/**
 * Applies migration steps to an in-memory adapter store.
 */
export function createInMemoryMigrationExecutor(
	data: Map<string, Map<string | number, Record<string, unknown>>>,
	schema: MelonSchema,
): MigrationStepExecutor {
	return {
		async applyStep(
			step: MigrationStep,
			currentSchema: MelonSchema,
		): Promise<void> {
			if (step.type === "createTable") {
				if (!data.has(step.collection)) {
					data.set(step.collection, new Map());
				}
				return;
			}

			if (step.type === "addColumns") {
				const store = data.get(step.collection);
				if (!store) {
					throw new Error(`Collection "${step.collection}" does not exist`);
				}
				for (const record of store.values()) {
					for (const [fieldName, fieldDef] of Object.entries(step.fields)) {
						if (!(fieldName in record)) {
							record[fieldName] = defaultForField(fieldDef);
						}
					}
				}
				void currentSchema;
				void schema;
				return;
			}

			if (step.type === "addIndexes") {
				return;
			}
		},
	};
}

function defaultForField(field: FieldDefinition): unknown {
	if (field.default !== undefined) {
		return field.default;
	}
	if (field.nullable) {
		return null;
	}
	switch (field.kind) {
		case "boolean":
			return false;
		case "number":
			return 0;
		case "date":
			return null;
		default:
			return null;
	}
}
