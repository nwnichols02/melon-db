import {
	type CallExpression,
	type Expression,
	Node,
	type SourceFile,
	SyntaxKind,
} from "ts-morph";
import {
	describeQOnMigration,
	formatQOnRecipeComment,
} from "../compat/q-on-recipe.ts";
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

type TrailingQueryMethod = "fetch" | "observe" | "findMany";

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
 * Builds a where clause fragment from Q.where(...).
 */
function buildWhereFragment(qCall: CallExpression): string {
	const args = qCall.getArguments();
	if (args.length < 2) {
		return "";
	}

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

/**
 * Builds filter chain fragments from Q expressions (where, and, or).
 */
export function buildFromQExpr(
	expr: Expression,
	warnings: string[],
	parentCollection?: string,
): string {
	if (!Node.isCallExpression(expr)) {
		return "";
	}

	const method = getQMethod(expr);
	if (!method) {
		return "";
	}

	if (method === "where") {
		return buildWhereFragment(expr);
	}

	if (method === "and" || method === "or") {
		const childParts = expr
			.getArguments()
			.filter((arg): arg is CallExpression => Node.isCallExpression(arg))
			.map((arg) => buildFromQExpr(arg, warnings, parentCollection))
			.filter(Boolean);

		if (childParts.length === 0) {
			warnings.push(`Q.${method} had no supported child clauses`);
			return "";
		}

		return `.${method}(q2 => q2${childParts.join("")})`;
	}

	if (method === "on") {
		const args = expr.getArguments();
		const relatedTable =
			args[0] && Node.isStringLiteral(args[0])
				? args[0].getLiteralText()
				: "related";
		warnings.push(
			`Q.on at line ${expr.getStartLineNumber()} — see /docs/migration#q-on`,
		);
		if (parentCollection) {
			const recipe = describeQOnMigration({
				parentCollection,
				relatedTable,
			});
			warnings.push(formatQOnRecipeComment(recipe));
		}
		return "";
	}

	return "";
}

/**
 * Builds a fluent builder chain fragment from a top-level Q call (sort/skip/take/filters).
 */
function buildFromQCall(
	qCall: CallExpression,
	warnings: string[],
	parentCollection?: string,
): string {
	const method = getQMethod(qCall);
	if (!method) {
		return "";
	}

	if (
		method === "where" ||
		method === "and" ||
		method === "or" ||
		method === "on"
	) {
		return buildFromQExpr(qCall, warnings, parentCollection);
	}

	const args = qCall.getArguments();

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

	return "";
}

/**
 * Resolves database.get('collection').query(...) call context.
 */
function resolveDatabaseQueryCall(
	queryCall: CallExpression,
	sourceVar: string,
): { collection: string; getCall: CallExpression } | null {
	const queryExpr = queryCall.getExpression();
	if (!Node.isPropertyAccessExpression(queryExpr)) {
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

	const dbRef = getExpr.getExpression();
	if (!Node.isIdentifier(dbRef) || dbRef.getText() !== sourceVar) {
		return null;
	}

	const collectionArg = getCall.getArguments()[0];
	if (!collectionArg || !Node.isStringLiteral(collectionArg)) {
		return null;
	}

	return { collection: collectionArg.getLiteralText(), getCall };
}

/**
 * Detects trailing .fetch() / .observe() on a query call.
 */
function getTrailingQueryMethod(
	queryCall: CallExpression,
): TrailingQueryMethod {
	let current: Expression = queryCall;

	while (Node.isPropertyAccessExpression(current.getParent())) {
		const parent = current.getParent();
		if (!Node.isPropertyAccessExpression(parent)) {
			break;
		}

		const parentCall = parent.getParent();
		if (!Node.isCallExpression(parentCall)) {
			break;
		}

		const method = parent.getName();
		if (method === "fetch" || method === "observe") {
			return method;
		}

		current = parentCall;
	}

	return "findMany";
}

/**
 * Returns the outermost call expression to replace (includes .fetch() / .observe()).
 */
function getReplacementTarget(queryCall: CallExpression): CallExpression {
	let target = queryCall;
	let current: Expression = queryCall;

	while (Node.isPropertyAccessExpression(current.getParent())) {
		const parent = current.getParent();
		if (!Node.isPropertyAccessExpression(parent)) {
			break;
		}

		const parentCall = parent.getParent();
		if (!Node.isCallExpression(parentCall)) {
			break;
		}

		const method = parent.getName();
		if (method === "fetch" || method === "observe") {
			target = parentCall;
			current = parentCall;
			continue;
		}

		break;
	}

	return target;
}

/**
 * Builds the Melon collection access expression for a migrated query.
 */
function buildCollectionAccess(
	dbVar: string,
	collection: string,
	builderChain: string,
	trailing: TrailingQueryMethod,
	observeArgs: string,
): string {
	const astExpr = builderChain;

	if (trailing === "fetch") {
		return `${dbVar}.collection('${collection}').query(${astExpr}).fetch()`;
	}

	if (trailing === "observe") {
		return `${dbVar}.collection('${collection}').query(${astExpr}).observe(${observeArgs})`;
	}

	return `${dbVar}.collection('${collection}').findMany(${astExpr})`;
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

	interface PendingMigration {
		start: number;
		end: number;
		replacementText: string;
		commentOffset?: number;
		qOnComment?: string;
	}

	const pending: PendingMigration[] = [];
	const processed = new Set<CallExpression>();

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
		if (processed.has(queryCall)) {
			continue;
		}

		const context = resolveDatabaseQueryCall(queryCall, sourceVar);
		if (!context) {
			continue;
		}

		const { collection } = context;
		const chainParts: string[] = [];
		const localWarnings: string[] = [];

		for (const arg of queryCall.getArguments()) {
			if (Node.isCallExpression(arg) && getQMethod(arg)) {
				const part = buildFromQCall(arg, localWarnings, collection);
				if (part) {
					chainParts.push(part);
				}
			}
		}

		result.warnings.push(...localWarnings);

		const builderChain =
			chainParts.length > 0
				? `q.from('${collection}')${chainParts.join("")}.toAst()`
				: `q.from('${collection}').toAst()`;

		const trailing = getTrailingQueryMethod(queryCall);
		const replacementTarget = getReplacementTarget(queryCall);

		let observeArgs = "";
		if (trailing === "observe") {
			const args = replacementTarget.getArguments();
			observeArgs = args.map((a) => a.getText()).join(", ");
		}

		let qOnComment: string | undefined;
		let commentOffset: number | undefined;
		const qOnCall = queryCall
			.getArguments()
			.find(
				(arg): arg is CallExpression =>
					Node.isCallExpression(arg) && getQMethod(arg) === "on",
			);
		if (qOnCall) {
			const relatedArg = qOnCall.getArguments()[0];
			const relatedTable =
				relatedArg && Node.isStringLiteral(relatedArg)
					? relatedArg.getLiteralText()
					: "related";
			qOnComment = formatQOnRecipeComment(
				describeQOnMigration({ parentCollection: collection, relatedTable }),
			);
			const lineStart = sourceFile
				.getFullText()
				.lastIndexOf("\n", replacementTarget.getStart() - 1);
			commentOffset = lineStart === -1 ? 0 : lineStart + 1;
		}

		pending.push({
			start: replacementTarget.getStart(),
			end: replacementTarget.getEnd(),
			replacementText: buildCollectionAccess(
				dbVar,
				collection,
				builderChain,
				trailing,
				observeArgs,
			),
			qOnComment,
			commentOffset,
		});

		processed.add(queryCall);
		processed.add(replacementTarget);
	}

	if (pending.length > 0) {
		let text = sourceFile.getFullText();
		const sorted = [...pending].sort((a, b) => b.start - a.start);
		for (const migration of sorted) {
			text =
				text.slice(0, migration.start) +
				migration.replacementText +
				text.slice(migration.end);
		}
		const commentMigrations = pending
			.filter((m) => m.qOnComment && m.commentOffset !== undefined)
			.sort((a, b) => (b.commentOffset ?? 0) - (a.commentOffset ?? 0));
		for (const migration of commentMigrations) {
			const offset = migration.commentOffset ?? 0;
			if (!text.slice(0, offset).includes("@melon-codemod Q.on")) {
				text = `${text.slice(0, offset)}${migration.qOnComment}\n${text.slice(offset)}`;
			}
		}
		sourceFile.replaceWithText(text);
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
