import {
	type CallExpression,
	type Expression,
	Node,
	type SourceFile,
	SyntaxKind,
} from "ts-morph";
import {
	type CodemodOptions,
	type CodemodResult,
	runCodemod,
	shouldIgnoreFile,
} from "./runner.ts";

const Q_OPERATORS = new Set([
	"eq",
	"notEq",
	"gt",
	"gte",
	"lt",
	"lte",
	"like",
	"oneOf",
	"notIn",
]);

/**
 * Returns the Q.method name from a call expression, if any.
 */
function getQMethod(expr: CallExpression): string | undefined {
	const expression = expr.getExpression();
	if (!Node.isPropertyAccessExpression(expression)) {
		return undefined;
	}
	const obj = expression.getExpression();
	if (!Node.isIdentifier(obj) || obj.getText() !== "Q") {
		return undefined;
	}
	return expression.getName();
}

/**
 * Serializes a literal expression for generated builder output.
 */
function literalValue(node: Expression): string {
	if (Node.isStringLiteral(node)) {
		return `'${node.getLiteralText()}'`;
	}
	if (Node.isNumericLiteral(node)) {
		return node.getText();
	}
	if (node.getKind() === SyntaxKind.TrueKeyword) {
		return "true";
	}
	if (node.getKind() === SyntaxKind.FalseKeyword) {
		return "false";
	}
	if (node.getKind() === SyntaxKind.NullKeyword) {
		return "null";
	}
	return node.getText();
}

/**
 * Maps Watermelon Q operator names to Melon query operator strings.
 */
function toMelonOp(watermelonOp: string): string {
	if (watermelonOp === "notEq") {
		return "neq";
	}
	if (watermelonOp === "oneOf") {
		return "in";
	}
	return watermelonOp;
}

/**
 * Builds a fluent builder chain fragment from a Q call expression.
 */
function buildFromQCall(qCall: CallExpression, warnings: string[]): string {
	const method = getQMethod(qCall);
	if (!method) {
		return "";
	}

	const args = qCall.getArguments();

	if (method === "where" && args.length >= 2) {
		const field = (args[0] as Expression).getText().replace(/^['"]|['"]$/g, "");
		const second = args[1] as Expression;

		if (
			Node.isStringLiteral(second) ||
			Node.isNumericLiteral(second) ||
			second.getKind() === SyntaxKind.TrueKeyword ||
			second.getKind() === SyntaxKind.FalseKeyword ||
			second.getKind() === SyntaxKind.NullKeyword
		) {
			return `.where('${field}', 'eq', ${literalValue(second)})`;
		}

		if (Node.isCallExpression(second) && getQMethod(second)) {
			const op = getQMethod(second);
			if (op && Q_OPERATORS.has(op)) {
				const valueArg = second.getArguments()[0] as Expression | undefined;
				return `.where('${field}', '${toMelonOp(op)}', ${valueArg ? literalValue(valueArg) : "undefined"})`;
			}
		}

		return `.where('${field}', 'eq', ${second.getText()})`;
	}

	if (method === "sortBy" && args.length >= 2) {
		const field = (args[0] as Expression).getText().replace(/^['"]|['"]$/g, "");
		const dirArg = args[1] as Expression;
		let direction = "asc";
		if (
			Node.isPropertyAccessExpression(dirArg) &&
			Node.isIdentifier(dirArg.getExpression()) &&
			dirArg.getExpression().getText() === "Q"
		) {
			direction = dirArg.getName() === "desc" ? "desc" : "asc";
		}
		return `.orderBy('${field}', '${direction}')`;
	}

	if (method === "skip" && args.length >= 1) {
		return `.skip(${literalValue(args[0] as Expression)})`;
	}

	if (method === "take" && args.length >= 1) {
		return `.limit(${literalValue(args[0] as Expression)})`;
	}

	if (method === "on") {
		warnings.push("Q.on is unsupported — left for manual migration");
		return "";
	}

	if (method === "and" || method === "or") {
		warnings.push(`Q.${method} in query codemod requires manual review`);
		return "";
	}

	return "";
}

/**
 * Applies query migration transforms to a source file.
 */
export function applyMigrateQueriesTransform(
	sourceFile: SourceFile,
	options: Pick<CodemodOptions, "dbVar" | "sourceVar">,
	result: CodemodResult,
): void {
	if (shouldIgnoreFile(sourceFile.getFullText())) {
		return;
	}

	const dbVar = options.dbVar ?? "db";
	const sourceVar = options.sourceVar ?? "database";

	const queryCalls = sourceFile
		.getDescendantsOfKind(SyntaxKind.CallExpression)
		.filter((call) => {
			const expr = call.getExpression();
			if (!Node.isPropertyAccessExpression(expr)) {
				return false;
			}
			return expr.getName() === "query";
		});

	for (const queryCall of queryCalls) {
		const queryExpr = queryCall.getExpression();
		if (!Node.isPropertyAccessExpression(queryExpr)) {
			continue;
		}

		const getCall = queryExpr.getExpression();
		if (!Node.isCallExpression(getCall)) {
			continue;
		}

		const getExpr = getCall.getExpression();
		if (
			!Node.isPropertyAccessExpression(getExpr) ||
			getExpr.getName() !== "get"
		) {
			continue;
		}

		const dbRef = getExpr.getExpression();
		if (!Node.isIdentifier(dbRef) || dbRef.getText() !== sourceVar) {
			continue;
		}

		const collectionArg = getCall.getArguments()[0];
		if (!collectionArg || !Node.isStringLiteral(collectionArg)) {
			result.warnings.push(
				`Skipped dynamic collection name at line ${queryCall.getStartLineNumber()}`,
			);
			continue;
		}

		const collection = collectionArg.getLiteralText();
		const chainParts: string[] = [];

		for (const arg of queryCall.getArguments()) {
			if (Node.isCallExpression(arg) && getQMethod(arg)) {
				const part = buildFromQCall(arg, result.warnings);
				if (part) {
					chainParts.push(part);
				}
			}
		}

		const builderChain =
			chainParts.length > 0
				? `q.from('${collection}')${chainParts.join("")}.toAst()`
				: `q.from('${collection}').toAst()`;

		queryCall.replaceWithText(
			`${dbVar}.collection('${collection}').findMany(${builderChain})`,
		);
	}

	const remainingGetPattern = new RegExp(`${sourceVar}\\.get\\(`, "g");
	if (remainingGetPattern.test(sourceFile.getFullText())) {
		sourceFile.replaceWithText(
			sourceFile
				.getFullText()
				.replace(remainingGetPattern, `${dbVar}.collection(`),
		);
	}

	if (sourceFile.getFullText().includes("q.from(")) {
		const hasImport = sourceFile
			.getImportDeclarations()
			.some((decl) =>
				decl.getModuleSpecifierValue().includes("@melon/db-query"),
			);
		if (!hasImport) {
			sourceFile.insertStatements(0, ["const q = createQueryFactory(schema);"]);
			sourceFile.insertStatements(0, [
				'import { createQueryFactory } from "@melon/db-query";',
			]);
		}
	}
}

/**
 * Transforms database.get().query(Q.*) calls to db.collection().findMany(q.from()...).
 */
export function migrateQueries(options: CodemodOptions): CodemodResult {
	return runCodemod(options, (sourceFile, result) => {
		applyMigrateQueriesTransform(sourceFile, options, result);
	});
}
