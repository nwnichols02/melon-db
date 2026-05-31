import {
	type ArrowFunction,
	type Block,
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

const TODO_COMMENT =
	"// TODO(melon-codemod): manual migration — complex create/update callback";

/**
 * Extracts `{ field: value }` from simple assignment statements in an arrow body.
 */
function extractAssignmentsFromArrow(
	fn: ArrowFunction,
	recordParam: string,
): Record<string, string> | null {
	const body = fn.getBody();
	const assignments: Record<string, string> = {};

	if (Node.isBlock(body)) {
		for (const stmt of body.getStatements()) {
			if (!Node.isExpressionStatement(stmt)) {
				return null;
			}
			const expr = stmt.getExpression();
			if (!Node.isBinaryExpression(expr)) {
				return null;
			}
			if (expr.getOperatorToken().getKind() !== SyntaxKind.EqualsToken) {
				return null;
			}
			const left = expr.getLeft();
			if (!Node.isPropertyAccessExpression(left)) {
				return null;
			}
			const obj = left.getExpression();
			if (!Node.isIdentifier(obj) || obj.getText() !== recordParam) {
				return null;
			}
			assignments[left.getName()] = expr.getRight().getText();
		}
		return assignments;
	}

	if (Node.isBinaryExpression(body)) {
		const left = body.getLeft();
		if (
			Node.isPropertyAccessExpression(left) &&
			Node.isIdentifier(left.getExpression()) &&
			left.getExpression().getText() === recordParam
		) {
			assignments[left.getName()] = body.getRight().getText();
			return assignments;
		}
	}

	return null;
}

/**
 * Formats an object literal from field assignments.
 */
function formatObjectLiteral(fields: Record<string, string>): string {
	const entries = Object.entries(fields).map(
		([key, value]) => `${key}: ${value}`,
	);
	return `{ ${entries.join(", ")} }`;
}

/**
 * Applies write migration transforms to a source file.
 */
export function applyMigrateWritesTransform(
	sourceFile: SourceFile,
	options: Pick<CodemodOptions, "dbVar" | "sourceVar">,
	result: CodemodResult,
): void {
	if (shouldIgnoreFile(sourceFile.getFullText())) {
		return;
	}

	const dbVar = options.dbVar ?? "db";
	const sourceVar = options.sourceVar ?? "database";

	const writeCalls = sourceFile
		.getDescendantsOfKind(SyntaxKind.CallExpression)
		.filter((call) => {
			const expr = call.getExpression();
			if (!Node.isPropertyAccessExpression(expr)) {
				return false;
			}
			return expr.getName() === "write";
		});

	for (const writeCall of writeCalls) {
		const writeExpr = writeCall.getExpression();
		if (!Node.isPropertyAccessExpression(writeExpr)) {
			continue;
		}
		const dbRef = writeExpr.getExpression();
		if (!Node.isIdentifier(dbRef) || dbRef.getText() !== sourceVar) {
			continue;
		}

		writeExpr.getExpression().replaceWithText(dbVar);

		const callback = writeCall.getArguments()[0];
		if (!callback || !Node.isArrowFunction(callback)) {
			continue;
		}

		if (callback.getParameters().length === 0) {
			callback.addParameter({ name: "tx" });
		} else {
			callback.getParameters()[0]?.rename("tx");
		}

		const body = callback.getBody();
		if (!Node.isBlock(body)) {
			continue;
		}

		transformWriteBlock(body, sourceVar, result);
	}
}

/**
 * Transforms create/update calls inside a db.write block.
 */
function transformWriteBlock(
	block: Block,
	sourceVar: string,
	result: CodemodResult,
): void {
	const collectionByVar = new Map<string, string>();

	for (const stmt of block.getStatements()) {
		if (Node.isVariableStatement(stmt)) {
			transformCreateStatement(stmt, sourceVar, collectionByVar, result);
		}
	}

	for (const stmt of block.getStatements()) {
		if (Node.isExpressionStatement(stmt)) {
			transformUpdateStatement(stmt, collectionByVar, result);
		}
	}
}

/**
 * Transforms a create call inside a variable declaration.
 */
function transformCreateStatement(
	stmt: import("ts-morph").VariableStatement,
	sourceVar: string,
	collectionByVar: Map<string, string>,
	result: CodemodResult,
): void {
	const decl = stmt.getDeclarations()[0];
	const init = decl?.getInitializer();
	if (!init || !Node.isAwaitExpression(init)) {
		return;
	}

	const inner = init.getExpression();
	if (!inner || !Node.isCallExpression(inner)) {
		return;
	}

	const createExpr = inner.getExpression();
	if (
		!Node.isPropertyAccessExpression(createExpr) ||
		createExpr.getName() !== "create"
	) {
		return;
	}

	const getCall = createExpr.getExpression();
	if (!Node.isCallExpression(getCall)) {
		return;
	}

	const getExpr = getCall.getExpression();
	if (
		!Node.isPropertyAccessExpression(getExpr) ||
		getExpr.getName() !== "get" ||
		!Node.isIdentifier(getExpr.getExpression()) ||
		getExpr.getExpression().getText() !== sourceVar
	) {
		return;
	}

	const collectionArg = getCall.getArguments()[0];
	if (!collectionArg || !Node.isStringLiteral(collectionArg)) {
		result.warnings.push("Skipped create with dynamic collection name");
		return;
	}

	const collection = collectionArg.getLiteralText();
	const createCallback = inner.getArguments()[0];

	if (!createCallback || !Node.isArrowFunction(createCallback)) {
		result.warnings.push(TODO_COMMENT);
		return;
	}

	const param = createCallback.getParameters()[0]?.getName() ?? "record";
	const fields = extractAssignmentsFromArrow(createCallback, param);

	if (!fields || Object.keys(fields).length === 0) {
		result.warnings.push(
			`Complex create callback at line ${inner.getStartLineNumber()} — manual migration needed`,
		);
		return;
	}

	const varName = decl?.getName();
	if (!varName) {
		return;
	}
	collectionByVar.set(varName, collection);

	inner.replaceWithText(
		`tx.collection('${collection}').insert(${formatObjectLiteral(fields)})`,
	);
}

/**
 * Transforms a record.update() expression statement.
 */
function transformUpdateStatement(
	stmt: import("ts-morph").ExpressionStatement,
	collectionByVar: Map<string, string>,
	result: CodemodResult,
): void {
	const expr = stmt.getExpression();
	if (!Node.isAwaitExpression(expr)) {
		return;
	}

	const call = expr.getExpression();
	if (!call || !Node.isCallExpression(call)) {
		return;
	}

	const callExpr = call.getExpression();
	if (
		!Node.isPropertyAccessExpression(callExpr) ||
		callExpr.getName() !== "update"
	) {
		return;
	}

	const recordRef = callExpr.getExpression();
	if (!Node.isIdentifier(recordRef)) {
		return;
	}

	const collection = collectionByVar.get(recordRef.getText());
	if (!collection) {
		result.warnings.push(
			`Could not infer collection for ${recordRef.getText()}.update() — manual migration needed`,
		);
		return;
	}

	const updateCallback = call.getArguments()[0];
	if (!updateCallback || !Node.isArrowFunction(updateCallback)) {
		result.warnings.push(TODO_COMMENT);
		return;
	}

	const param =
		updateCallback.getParameters()[0]?.getName() ?? recordRef.getText();
	const fields = extractAssignmentsFromArrow(updateCallback, param);

	if (!fields || Object.keys(fields).length === 0) {
		result.warnings.push(TODO_COMMENT);
		return;
	}

	call.replaceWithText(
		`tx.collection('${collection}').update(${recordRef.getText()}.id, ${formatObjectLiteral(fields)})`,
	);
}

/**
 * Transforms database.write() and create/update patterns to db.write(tx => ...).
 */
export function migrateWrites(options: CodemodOptions): CodemodResult {
	return runCodemod(options, (sourceFile, result) => {
		applyMigrateWritesTransform(sourceFile, options, result);
	});
}
