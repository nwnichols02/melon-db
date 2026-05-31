import type { MelonScalar } from "@melon/db";

const PRISMA_SCALAR_MAP: Record<string, MelonScalar> = {
	String: "string",
	Int: "number",
	Float: "number",
	Boolean: "boolean",
	DateTime: "date",
	Json: "json",
	Bytes: "bytes",
	BigInt: "number",
	Decimal: "number",
};

/**
 * Maps a Prisma scalar type name to a Melon field kind.
 */
export function mapPrismaScalar(type: string): MelonScalar {
	return PRISMA_SCALAR_MAP[type] ?? "string";
}

/**
 * Converts a Prisma model name to a Melon collection name.
 */
export function modelToCollectionName(modelName: string): string {
	const lower = modelName.charAt(0).toLowerCase() + modelName.slice(1);
	return lower.endsWith("s") ? lower : `${lower}s`;
}

/**
 * Strips datasource url lines for Prisma 7 compatibility when parsing schemas.
 */
export function normalizePrismaSchemaForImport(schema: string): string {
	return schema
		.split("\n")
		.filter((line) => !/^\s*url\s*=/.test(line))
		.join("\n");
}
