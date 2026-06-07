import {
	type CallExpression,
	type Expression,
	Node,
	type ObjectLiteralExpression,
	type SourceFile,
	SyntaxKind,
} from "ts-morph";
import {
	type CodemodOptions,
	type CodemodResult,
	runCodemod,
	shouldIgnoreFile,
} from "./runner.ts";

const REACT_IMPORT_SOURCE = "@nozbe/watermelondb/react";
const MELON_REACT_IMPORT = "@melon-db/db-react";

const IMPORT_REPLACEMENTS: Record<string, string> = {
	DatabaseProvider: "MelonDbProvider",
};

const WITH_OBSERVABLES_TODO =
	"// TODO(melon-codemod): withObservables — manual hook migration; see /docs/migration#withobservables";

/**
 * Unwraps parenthesized object literal bodies from arrow functions.
 */
function unwrapObjectLiteralBody(
	body: Expression,
): ObjectLiteralExpression | null {
	if (Node.isObjectLiteralExpression(body)) {
		return body;
	}
	if (Node.isParenthesizedExpression(body)) {
		const inner = body.getExpression();
		if (Node.isObjectLiteralExpression(inner)) {
			return inner;
		}
	}
	return null;
}

/**
 * Parses a simple database.get('col').query(...).observe() chain.
 */
function parseObserveChain(call: CallExpression): {
	collection: string;
	queryArgs: string;
} | null {
	const observeExpr = call.getExpression();
	if (!Node.isPropertyAccessExpression(observeExpr)) {
		return null;
	}
	if (observeExpr.getName() !== "observe") {
		return null;
	}

	const queryCall = observeExpr.getExpression();
	if (!Node.isCallExpression(queryCall)) {
		return null;
	}

	const queryExpr = queryCall.getExpression();
	if (
		!Node.isPropertyAccessExpression(queryExpr) ||
		queryExpr.getName() !== "query"
	) {
		return null;
	}

	const getCall = queryExpr.getExpression();
	if (!Node.isCallExpression(getCall)) {
		return null;
	}

	const getExpr = getCall.getExpression();
	if (
		!Node.isPropertyAccessExpression(getExpr) ||
		getExpr.getName() !== "get"
	) {
		return null;
	}

	const collectionArg = getCall.getArguments()[0];
	if (!collectionArg || !Node.isStringLiteral(collectionArg)) {
		return null;
	}

	const queryArgs = queryCall
		.getArguments()
		.map((arg) => arg.getText())
		.join(", ");

	return { collection: collectionArg.getLiteralText(), queryArgs };
}

/**
 * Transforms withObservables HOC wrappers to hook suggestions.
 */
function transformWithObservables(
	sourceFile: SourceFile,
	result: CodemodResult,
): void {
	const hocCalls: CallExpression[] = [];

	for (const call of sourceFile.getDescendantsOfKind(
		SyntaxKind.CallExpression,
	)) {
		const expr = call.getExpression();
		if (!Node.isCallExpression(expr)) {
			continue;
		}
		const innerExpr = expr.getExpression();
		if (
			Node.isIdentifier(innerExpr) &&
			innerExpr.getText() === "withObservables"
		) {
			hocCalls.push(call);
		}
	}

	for (const hocCall of hocCalls) {
		const withObservablesCall = hocCall.getExpression();
		if (!Node.isCallExpression(withObservablesCall)) {
			continue;
		}

		const callback = withObservablesCall.getArguments()[1];
		if (!callback || !Node.isArrowFunction(callback)) {
			result.warnings.push(WITH_OBSERVABLES_TODO);
			continue;
		}

		const arrowBody = callback.getBody();
		if (Node.isBlock(arrowBody) || !Node.isExpression(arrowBody)) {
			result.warnings.push(WITH_OBSERVABLES_TODO);
			continue;
		}

		const body = unwrapObjectLiteralBody(arrowBody);
		if (!body) {
			result.warnings.push(WITH_OBSERVABLES_TODO);
			continue;
		}

		const hookLines: string[] = [];
		for (const prop of body.getProperties()) {
			if (!Node.isPropertyAssignment(prop)) {
				continue;
			}
			const key = prop.getName();
			const init = prop.getInitializer();
			if (!init || !Node.isCallExpression(init)) {
				result.warnings.push(WITH_OBSERVABLES_TODO);
				continue;
			}

			const chain = parseObserveChain(init);
			if (!chain) {
				result.warnings.push(WITH_OBSERVABLES_TODO);
				continue;
			}

			hookLines.push(
				`const ${key} = useFindMany('${chain.collection}'); // was: database.get('${chain.collection}').query(${chain.queryArgs}).observe()`,
			);
		}

		if (hookLines.length === 0) {
			continue;
		}

		const componentArg = hocCall.getArguments()[0];
		const componentName = componentArg?.getText() ?? "Component";

		const comment = [
			"/* @melon-codemod withObservables → hooks",
			" * Replace HOC with hooks inside the component body:",
			...hookLines.map((line) => ` * ${line}`),
			" * import { useFindMany } from '@melon-db/db-react';",
			" * See /docs/migration#withobservables",
			" */",
			`export default ${componentName};`,
		].join("\n");

		const lineNumber = hocCall.getStartLineNumber();

		const varStatement = hocCall.getFirstAncestorByKind(
			SyntaxKind.VariableStatement,
		);
		const exportedName = varStatement?.getDeclarations()[0]?.getName();
		if (varStatement) {
			varStatement.replaceWithText(comment);
		} else {
			hocCall.replaceWithText(comment);
		}

		if (exportedName) {
			for (const exp of sourceFile.getExportAssignments()) {
				if (exp.getExpression().getText() === exportedName) {
					exp.remove();
				}
			}
		}

		result.warnings.push(
			`withObservables at line ${lineNumber} — see /docs/migration#withobservables`,
		);
	}
}

/**
 * Applies React provider migration transforms to a source file.
 */
export function applyMigrateReactTransform(
	sourceFile: SourceFile,
	result: CodemodResult,
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

	transformWithObservables(sourceFile, result);
}

/**
 * Transforms WatermelonDB React imports and DatabaseProvider to Melon equivalents.
 */
export function migrateReact(options: CodemodOptions): CodemodResult {
	return runCodemod(options, (sourceFile, result) => {
		applyMigrateReactTransform(sourceFile, result);
	});
}
