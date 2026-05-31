import type { CollectionMetadata, MelonSchema } from "@melon/db";

function scalarToSql(kind: string): string {
	switch (kind) {
		case "string":
			return "TEXT";
		case "number":
			return "REAL";
		case "boolean":
			return "INTEGER";
		case "date":
			return "TEXT";
		case "json":
			return "TEXT";
		case "bytes":
			return "BLOB";
		default:
			return "TEXT";
	}
}

function quoteIdent(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Generates CREATE TABLE and INDEX statements for a Melon schema.
 */
export function generateDdl(schema: MelonSchema): string[] {
	const statements: string[] = [];

	for (const meta of Object.values(
		schema.collections,
	) as CollectionMetadata[]) {
		const columns = Object.entries(meta.fields).map(([name, field]) => {
			const sqlType = scalarToSql(field.kind);
			const nullable = field.nullable ? "" : " NOT NULL";
			return `${quoteIdent(name)} ${sqlType}${nullable}`;
		});

		if (!meta.fields[meta.primaryKey]) {
			columns.unshift(`${quoteIdent(meta.primaryKey)} TEXT NOT NULL`);
		}

		statements.push(
			`CREATE TABLE IF NOT EXISTS ${quoteIdent(meta.name)} (${columns.join(", ")}, PRIMARY KEY (${quoteIdent(meta.primaryKey)}))`,
		);

		for (const index of meta.indexes) {
			const indexName = `${meta.name}_${index.join("_")}_idx`;
			const cols = index.map(quoteIdent).join(", ");
			statements.push(
				`CREATE INDEX IF NOT EXISTS ${quoteIdent(indexName)} ON ${quoteIdent(meta.name)} (${cols})`,
			);
		}
	}

	return statements;
}
