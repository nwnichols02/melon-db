/**
 * Measures async function execution time in milliseconds.
 */
export async function measureMs(fn: () => Promise<void>): Promise<number> {
	const start = performance.now();
	await fn();
	return performance.now() - start;
}
