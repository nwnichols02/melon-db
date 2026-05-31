/**
 * Pretty-prints a value for devtools display.
 */
export function formatJson(value: unknown): string {
	try {
		return JSON.stringify(value, null, 2);
	} catch {
		return String(value);
	}
}
