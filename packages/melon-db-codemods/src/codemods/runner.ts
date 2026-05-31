import { readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
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
 * Collects TypeScript source files from a path (file or directory).
 */
export function collectSourceFiles(
	project: Project,
	targetPath: string,
): SourceFile[] {
	const stat = statSync(targetPath);
	if (stat.isFile()) {
		return [project.addSourceFileAtPath(targetPath)];
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
	walk(targetPath);
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
