import { MelonError, MelonErrorCode } from "./errors.ts";

export type MelonScalar =
	| "string"
	| "number"
	| "boolean"
	| "date"
	| "json"
	| "bytes";

export interface FieldDefinition {
	kind: MelonScalar;
	nullable?: boolean;
	indexed?: boolean;
	default?: unknown;
}

export interface RelationDefinition {
	kind: "belongsTo" | "hasMany";
	target: string;
	foreignKey: string;
}

export interface CollectionSchemaDefinition {
	name: string;
	fields: Record<string, FieldDefinition>;
	relations?: Record<string, RelationDefinition>;
	indexes?: string[][];
	primaryKey?: string;
	localOnly?: boolean;
}

export interface DatabaseSchemaDefinition {
	version: number;
	collections: Record<string, CollectionSchemaDefinition>;
}

export interface CollectionMetadata<RecordShape = Record<string, unknown>> {
	readonly name: string;
	readonly primaryKey: keyof RecordShape & string;
	readonly fields: Record<string, FieldDefinition>;
	readonly relations: Record<string, RelationDefinition>;
	readonly indexes: readonly string[][];
}

export interface MelonSchema<
	Collections extends Record<string, CollectionMetadata> = Record<
		string,
		CollectionMetadata
	>,
> {
	readonly version: number;
	readonly collections: Collections;
	getCollection<Name extends keyof Collections & string>(
		name: Name,
	): Collections[Name];
}

/**
 * Validates schema invariants and builds a runtime MelonSchema.
 */
export function createMelonSchema(def: DatabaseSchemaDefinition): MelonSchema {
	const collectionNames = Object.keys(def.collections);
	const uniqueNames = new Set(collectionNames);
	if (uniqueNames.size !== collectionNames.length) {
		throw new MelonError("Duplicate collection names in schema", {
			code: MelonErrorCode.SCHEMA_INVALID,
			remediation: "Ensure each collection has a unique name.",
		});
	}

	const metadata: Record<string, CollectionMetadata> = {};

	for (const [key, collection] of Object.entries(def.collections)) {
		if (collection.name !== key) {
			throw new MelonError(
				`Collection key "${key}" does not match collection.name "${collection.name}"`,
				{
					code: MelonErrorCode.SCHEMA_INVALID,
				},
			);
		}

		const primaryKey = collection.primaryKey ?? "id";
		if (!(primaryKey in collection.fields) && primaryKey !== "id") {
			throw new MelonError(
				`Primary key "${primaryKey}" is not defined on collection "${collection.name}"`,
				{
					code: MelonErrorCode.SCHEMA_INVALID,
				},
			);
		}

		if (collection.relations) {
			for (const [relName, relation] of Object.entries(collection.relations)) {
				if (!def.collections[relation.target]) {
					throw new MelonError(
						`Relation "${relName}" on "${collection.name}" targets unknown collection "${relation.target}"`,
						{ code: MelonErrorCode.SCHEMA_INVALID },
					);
				}
			}
		}

		metadata[key] = {
			name: collection.name,
			primaryKey: primaryKey as string,
			fields: collection.fields,
			relations: collection.relations ?? {},
			indexes: collection.indexes ?? [],
		};
	}

	return {
		version: def.version,
		collections: metadata as Record<string, CollectionMetadata>,
		getCollection(name) {
			const collection = metadata[name];
			if (!collection) {
				throw new MelonError(`Unknown collection "${name}"`, {
					code: MelonErrorCode.SCHEMA_INVALID,
				});
			}
			return collection;
		},
	};
}
