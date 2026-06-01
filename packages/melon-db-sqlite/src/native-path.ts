/**
 * Resolves a database file path for JSI SQLite (rejects path traversal).
 */
export function resolveNativeDatabasePath(
	filename: string,
	basePath?: string,
): string {
	if (filename.includes("..")) {
		throw new Error("Invalid database filename: path traversal is not allowed");
	}
	if (filename.startsWith("/")) {
		return filename;
	}
	if (!basePath) {
		throw new Error(
			"JSI SQLite requires basePath (e.g. expo-file-system documentDirectory) or an absolute filename",
		);
	}
	const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
	return `${base}/${filename}`;
}
