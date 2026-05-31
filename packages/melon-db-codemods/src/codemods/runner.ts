import { existsSync, readdirSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { Project, type SourceFile } from "ts-morph";

export const CODEMOD_IGNORE = "@melon-codemod-ignore";

export interface CodemodOptions {
	path: string;
	dryRun?: boolean;
	dbVar?: string;
	sourceVar?: string;
}

export interface CodemodResult {
	filesChanged: number;
	warnings: string[];
	errors: string[];
}

/**
 * Returns true when a file should be skipped by codemods.
 */
export function shouldIgnoreFile(content: string): boolean {
	return content.includes(CODEMOD_IGNORE);
}

/**
 * Resolves and validates a codemod target path.
 */
export function resolveCodemodPath(targetPath: string): string {
	const resolved = resolve(process.cwd(), targetPath);
	if (!existsSync(resolved)) {
		throw new Error(
			`Path not found: ${targetPath} (resolved to ${resolved}). In this monorepo, try --path=apps/playground-rn/src or --path=apps/playground-rn/app`,
		);
	}
	return resolved;
}

/**
 * Collects TypeScript source files from a path (file or directory).
 */
export function collectSourceFiles(
	project: Project,
	targetPath: string,
): SourceFile[] {
	const resolvedPath = resolveCodemodPath(targetPath);
	const stat = statSync(resolvedPath);
	if (stat.isFile()) {
		return [project.addSourceFileAtPath(resolvedPath)];
	}

	const files: string[] = [];
	function walk(dir: string): void {
		for (const entry of readdirSync(dir)) {
			const full = join(dir, entry);
			const entryStat = statSync(full);
			if (entryStat.isDirectory()) {
				walk(full);
				continue;
			}
			const ext = extname(full);
			if (ext === ".ts" || ext === ".tsx") {
				files.push(full);
			}
		}
	}
	walk(resolvedPath);

	if (files.length === 0) {
		throw new Error(
			`No .ts or .tsx files found under ${targetPath}. Check --path points at your app source directory.`,
		);
	}

	return files.map((file) => project.addSourceFileAtPath(file));
}

/**
 * Runs a transform across source files with dry-run and ignore support.
 */
export function runCodemod(
	options: CodemodOptions,
	transform: (sourceFile: SourceFile, result: CodemodResult) => void,
): CodemodResult {
	const result: CodemodResult = {
		filesChanged: 0,
		warnings: [],
		errors: [],
	};

	const project = new Project({
		useInMemoryFileSystem: false,
		skipAddingFilesFromTsConfig: true,
	});

	const sourceFiles = collectSourceFiles(project, options.path);

	for (const sourceFile of sourceFiles) {
		if (shouldIgnoreFile(sourceFile.getFullText())) {
			result.warnings.push(
				`Skipped ${sourceFile.getFilePath()} (ignore marker)`,
			);
			continue;
		}

		const before = sourceFile.getFullText();
		try {
			transform(sourceFile, result);
		} catch (error) {
			result.errors.push(
				`${sourceFile.getFilePath()}: ${error instanceof Error ? error.message : String(error)}`,
			);
			continue;
		}

		const after = sourceFile.getFullText();
		if (before !== after) {
			result.filesChanged += 1;
			if (!options.dryRun) {
				sourceFile.saveSync();
			}
		}
	}

	return result;
}

/**
 * Creates an in-memory ts-morph project for fixture tests.
 */
export function createInMemoryProject(
	filePath: string,
	content: string,
): { project: Project; sourceFile: SourceFile } {
	const project = new Project({ useInMemoryFileSystem: true });
	const sourceFile = project.createSourceFile(filePath, content);
	return { project, sourceFile };
}

/**
 * Normalizes whitespace for fixture comparison.
 */
export function normalizeCode(code: string): string {
	return code
		.replace(/\r\n/g, "\n")
		.replace(/'/g, '"')
		.split("\n")
		.map((line) => line.trimEnd())
		.join("\n")
		.trim();
}
