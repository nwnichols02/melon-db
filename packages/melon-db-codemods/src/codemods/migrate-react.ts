import { type SourceFile, SyntaxKind } from "ts-morph";
import {
	type CodemodOptions,
	type CodemodResult,
	runCodemod,
	shouldIgnoreFile,
} from "./runner.ts";

const REACT_IMPORT_SOURCE = "@nozbe/watermelondb/react";
const MELON_REACT_IMPORT = "@melon/db-react";

const IMPORT_REPLACEMENTS: Record<string, string> = {
	DatabaseProvider: "MelonDbProvider",
};

/**
 * Applies React provider migration transforms to a source file.
 */
export function applyMigrateReactTransform(
	sourceFile: SourceFile,
	_result: CodemodResult,
): void {
	if (shouldIgnoreFile(sourceFile.getFullText())) {
		return;
	}

	for (const importDecl of sourceFile.getImportDeclarations()) {
		if (importDecl.getModuleSpecifierValue() !== REACT_IMPORT_SOURCE) {
			continue;
		}

		const namedImports = importDecl.getNamedImports();
		for (const spec of namedImports) {
			const name = spec.getName();
			const replacement = IMPORT_REPLACEMENTS[name];
			if (replacement) {
				spec.setName(replacement);
			}
		}

		importDecl.setModuleSpecifier(MELON_REACT_IMPORT);
	}

	const jsxElements = [
		...sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
		...sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
		...sourceFile.getDescendantsOfKind(SyntaxKind.JsxClosingElement),
	];

	for (const element of jsxElements) {
		const tag = element.getTagNameNode().getText();
		if (tag === "DatabaseProvider") {
			element.getTagNameNode().replaceWithText("MelonDbProvider");
		}
	}

	for (const attr of sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute)) {
		if (attr.getNameNode().getText() === "database") {
			attr.getNameNode().replaceWithText("db");
		}
	}
}

/**
 * Transforms WatermelonDB React imports and DatabaseProvider to Melon equivalents.
 */
export function migrateReact(options: CodemodOptions): CodemodResult {
	return runCodemod(options, (sourceFile, result) => {
		applyMigrateReactTransform(sourceFile, result);
	});
}
