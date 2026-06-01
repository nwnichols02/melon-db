export interface QOnMigrationRecipe {
	summary: string;
	steps: string[];
	exampleMelon?: string;
}

/**
 * Describes how to manually migrate a Watermelon Q.on join to Melon v1 patterns.
 */
export function describeQOnMigration(input: {
	parentCollection: string;
	relatedTable: string;
	foreignKeyHint?: string;
}): QOnMigrationRecipe {
	const fk = input.foreignKeyHint ?? `${input.relatedTable}_id`;
	const relationName = input.relatedTable;

	return {
		summary: `Melon v1 does not support Watermelon Q.on joins. Rewrite queries on "${input.parentCollection}" that filter via "${input.relatedTable}".`,
		steps: [
			`Add a belongsTo relation on "${input.parentCollection}" pointing to "${input.relatedTable}" (foreign key: ${fk}).`,
			`Replace Q.on('${input.relatedTable}', ...) with .include('${relationName}', { where: ... }) when the filter targets related fields.`,
			`Alternatively: query "${input.relatedTable}" first, collect ids, then filter "${input.parentCollection}" with Q.where / .where('${fk}', 'in', ids).`,
			"See /docs/migration#q-on for a full before/after example.",
		],
		exampleMelon: `q.from('${input.parentCollection}')\n  .include('${relationName}', { where: ... })\n  .toAst()`,
	};
}

/**
 * Formats a Q.on migration recipe as a block comment for codemod output.
 */
export function formatQOnRecipeComment(recipe: QOnMigrationRecipe): string {
	const lines = [
		"/* @melon-codemod Q.on — manual migration required",
		` * ${recipe.summary}`,
		...recipe.steps.map((step) => ` * - ${step}`),
	];
	if (recipe.exampleMelon) {
		lines.push(" * Example:");
		for (const line of recipe.exampleMelon.split("\n")) {
			lines.push(` *   ${line.trim()}`);
		}
	}
	lines.push(" */");
	return lines.join("\n");
}
