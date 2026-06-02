import { Directory, File, Paths } from "expo-file-system";

const BENCH_DB_PREFIX = "melon-bench";

/**
 * Removes leftover benchmark SQLite files from prior runs (avoids UNIQUE on task_* PKs).
 */
export async function cleanupBenchDatabaseFiles(): Promise<void> {
	try {
		const dir = new Directory(Paths.document);
		if (!dir.exists) {
			return;
		}
		for (const entry of dir.list()) {
			if (
				entry instanceof File &&
				entry.name.startsWith(BENCH_DB_PREFIX) &&
				entry.exists
			) {
				entry.delete();
			}
		}
	} catch {
		// Best-effort cleanup; unique run filenames still prevent collisions.
	}
}

/**
 * Allocates a fresh benchmark database filename for one adapter/scenario group.
 */
export function createBenchFilenameAllocator(runId: string): {
	next: (label: string) => string;
} {
	let sequence = 0;
	return {
		next(label: string): string {
			sequence += 1;
			return `${BENCH_DB_PREFIX}-${runId}-${label}-${sequence}.db`;
		},
	};
}
