import type {
	CollectionSchemaDefinition,
	DatabaseSchemaDefinition,
	FieldDefinition,
	RelationDefinition,
} from "@melon-db/db";
import { type ClassDeclaration, Node, type SourceFile } from "ts-morph";
import {
	type CodemodOptions,
	type CodemodResult,
	runCodemod,
	shouldIgnoreFile,
} from "./runner.ts";

const FIELD_DECORATOR = "field";
const RELATION_DECORATOR = "relation";
const DATE_DECORATOR = "date";
const READONLY_DECORATOR = "readonly";

/**
 * Maps Watermelon decorator field types to Melon scalar kinds.
 */
function mapFieldKind(typeText: string): FieldDefinition["kind"] {
	if (typeText.includes("string")) {
		return "string";
	}
	if (typeText.includes("number")) {
		return "number";
	}
	if (typeText.includes("boolean")) {
		return "boolean";
	}
	return "string";
}

/**
 * Extracts collection schema from a Watermelon Model class declaration.
 */
export function extractSchemaFromModelClass(
	cls: ClassDeclaration,
): CollectionSchemaDefinition | null {
	const tableProp = cls.getStaticProperty("table");
	if (!tableProp || !Node.isPropertyDeclaration(tableProp)) {
		return null;
	}
	const tableInit = tableProp.getInitializer();
	if (!tableInit || !Node.isStringLiteral(tableInit)) {
		return null;
	}

	const name = tableInit.getLiteralText();
	const fields: Record<string, FieldDefinition> = {
		id: { kind: "string" },
	};
	const relations: Record<string, RelationDefinition> = {};

	for (const prop of cls.getProperties()) {
		const propName = prop.getName();
		for (const decorator of prop.getDecorators()) {
			const call = decorator.getCallExpression();
			if (!call) {
				continue;
			}
			const decoratorName = decorator.getName();

			if (decoratorName === FIELD_DECORATOR) {
				const columnArg = call.getArguments()[0];
				const columnName =
					columnArg && Node.isStringLiteral(columnArg)
						? columnArg.getLiteralText()
						: propName;
				fields[columnName] = {
					kind: mapFieldKind(prop.getTypeNode()?.getText() ?? "string"),
				};
			}

			if (decoratorName === DATE_DECORATOR) {
				const columnArg = call.getArguments()[0];
				const columnName =
					columnArg && Node.isStringLiteral(columnArg)
						? columnArg.getLiteralText()
						: propName;
				fields[columnName] = { kind: "date" };
			}

			if (decoratorName === RELATION_DECORATOR) {
				const args = call.getArguments();
				const targetArg = args[0];
				if (!targetArg || !Node.isStringLiteral(targetArg)) {
					continue;
				}
				const target = targetArg.getLiteralText();
				let foreignKey = `${target}_id`;

				const second = args[1];
				if (second && Node.isStringLiteral(second)) {
					foreignKey = second.getLiteralText();
				} else if (second && Node.isObjectLiteralExpression(second)) {
					const fkProp = second.getProperty("foreignKey");
					if (fkProp && Node.isPropertyAssignment(fkProp)) {
						const fkInit = fkProp.getInitializer();
						if (fkInit && Node.isStringLiteral(fkInit)) {
							foreignKey = fkInit.getLiteralText();
						}
					}
				}

				relations[propName] = {
					kind: "belongsTo",
					target,
					foreignKey,
				};
			}

			if (decoratorName === READONLY_DECORATOR) {
				// readonly fields are still stored; no special Melon metadata in v1 spike
			}
		}
	}

	return {
		name,
		primaryKey: "id",
		fields,
		relations: Object.keys(relations).length > 0 ? relations : undefined,
	};
}

/**
 * Extracts a Melon database schema from Watermelon Model class files.
 */
export function extractSchemaFromSourceFile(
	sourceFile: SourceFile,
): DatabaseSchemaDefinition | null {
	if (shouldIgnoreFile(sourceFile.getFullText())) {
		return null;
	}

	const collections: Record<string, CollectionSchemaDefinition> = {};

	for (const cls of sourceFile.getClasses()) {
		const collection = extractSchemaFromModelClass(cls);
		if (collection) {
			collections[collection.name] = collection;
		}
	}

	if (Object.keys(collections).length === 0) {
		return null;
	}

	return { version: 1, collections };
}

/**
 * Applies schema extraction (no file mutations; populates result metadata).
 */
export function applyMigrateSchemaTransform(
	sourceFile: SourceFile,
	result: CodemodResult,
): DatabaseSchemaDefinition | null {
	const schema = extractSchemaFromSourceFile(sourceFile);
	if (!schema) {
		result.warnings.push(
			`No Watermelon Model classes found in ${sourceFile.getBaseName()}`,
		);
		return null;
	}
	return schema;
}

/**
 * Reads model files and returns extracted schema definitions.
 */
export function migrateSchema(options: CodemodOptions): {
	result: CodemodResult;
	schemas: DatabaseSchemaDefinition[];
} {
	const schemas: DatabaseSchemaDefinition[] = [];
	const result = runCodemod(options, (sourceFile, codemodResult) => {
		const schema = applyMigrateSchemaTransform(sourceFile, codemodResult);
		if (schema) {
			schemas.push(schema);
		}
	});
	return { result, schemas };
}

/**
 * Formats extracted schema as pretty-printed JSON for CLI output.
 */
export function formatSchemaOutput(schema: DatabaseSchemaDefinition): string {
	return JSON.stringify(schema, null, 2);
}
