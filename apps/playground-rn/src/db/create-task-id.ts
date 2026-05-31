/**
 * Generates a unique task id safe across app restarts and sync.
 */
export function createTaskId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
