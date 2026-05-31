import type {
	CollectionSchemaDefinition,
	DatabaseSchemaDefinition,
	FieldDefinition,
	RelationDefinition,
} from "@melon/db";
import { MelonError, MelonErrorCode } from "@melon/db";
import { getDMMF } from "@prisma/internals";
import {
	mapPrismaScalar,
	modelToCollectionName,
	normalizePrismaSchemaForImport,
} from "./map-types.ts";

interface DmmfField {
	name: string;
	kind: string;
	type: string;
	isRequired: boolean;
	isList: boolean;
	isId: boolean;
	isUnique: boolean;
	relationFromFields?: string[];
	relationToFields?: string[];
}

interface DmmfModel {
	name: string;
	fields: DmmfField[];
}

/**
 * Imports a Prisma schema string into a Melon DatabaseSchemaDefinition.
 */
export async function importPrismaSchema(
	prismaSchema: string,
): Promise<DatabaseSchemaDefinition> {
	const normalized = normalizePrismaSchemaForImport(prismaSchema);
	let dmmf: Awaited<ReturnType<typeof getDMMF>>;

	try {
		dmmf = await getDMMF({ datamodel: normalized });
	} catch (error) {
		throw new MelonError("Failed to parse Prisma schema", {
			code: MelonErrorCode.SCHEMA_INVALID,
			cause: error,
			remediation:
				"Ensure the schema uses supported models and scalar fields. Datasource url lines are stripped automatically for Prisma 7.",
		});
	}

	const providerMatch = normalized.match(/provider\s*=\s*"(\w+)"/);
	const provider = providerMatch?.[1];
	if (provider && provider !== "sqlite") {
		throw new MelonError(
			`Datasource provider "${provider}" is not supported in v1 (sqlite only)`,
			{ code: MelonErrorCode.SCHEMA_INVALID },
		);
	}

	const models = dmmf.datamodel.models as unknown as DmmfModel[];
	const collections: Record<string, CollectionSchemaDefinition> = {};

	for (const model of models) {
		const collectionName = modelToCollectionName(model.name);
		const fields: Record<string, FieldDefinition> = {};
		const relations: Record<string, RelationDefinition> = {};
		const indexes: string[][] = [];
		let primaryKey = "id";

		for (const field of model.fields) {
			if (field.kind === "scalar" || field.kind === "enum") {
				if (field.isId) {
					primaryKey = field.name;
				}
				fields[field.name] = {
					kind: field.kind === "enum" ? "string" : mapPrismaScalar(field.type),
					nullable: !field.isRequired,
				};
				if (field.isUnique && !field.isId) {
					indexes.push([field.name]);
				}
				continue;
			}

			if (field.kind === "object") {
				const target = modelToCollectionName(field.type);
				if (field.relationFromFields && field.relationFromFields.length > 0) {
					const foreignKey = field.relationFromFields[0];
					if (foreignKey) {
						relations[field.name] = {
							kind: "belongsTo",
							target,
							foreignKey,
						};
					}
					continue;
				}

				const inverseForeignKey = findInverseForeignKey(
					models,
					model.name,
					field.type,
				);
				if (inverseForeignKey) {
					relations[field.name] = {
						kind: "hasMany",
						target,
						foreignKey: inverseForeignKey,
					};
				}
			}
		}

		collections[collectionName] = {
			name: collectionName,
			primaryKey,
			fields,
			relations: Object.keys(relations).length > 0 ? relations : undefined,
			indexes: indexes.length > 0 ? indexes : undefined,
		};
	}

	return {
		version: 1,
		collections,
	};
}

function findInverseForeignKey(
	models: DmmfModel[],
	sourceModel: string,
	targetModel: string,
): string | null {
	const target = models.find((model) => model.name === targetModel);
	if (!target) {
		return null;
	}

	for (const field of target.fields) {
		if (field.kind !== "object" || field.type !== sourceModel) {
			continue;
		}
		const fk = field.relationFromFields?.[0];
		if (fk) {
			return fk;
		}
	}

	return null;
}
