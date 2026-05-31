import { SyncError, SyncErrorCode } from "./errors.ts";

export interface RetryPolicy {
	maxAttempts: number;
	baseDelayMs: number;
	maxDelayMs: number;
	jitter?: boolean;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
	maxAttempts: 3,
	baseDelayMs: 500,
	maxDelayMs: 8000,
	jitter: true,
};

function computeDelayMs(policy: RetryPolicy, attempt: number): number {
	const exponential = policy.baseDelayMs * 2 ** attempt;
	const capped = Math.min(policy.maxDelayMs, exponential);
	if (policy.jitter !== false) {
		return capped + Math.floor(Math.random() * policy.baseDelayMs);
	}
	return capped;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) {
		throw new SyncError("Sync cancelled", {
			code: SyncErrorCode.SYNC_CANCELLED,
			retryable: false,
		});
	}

	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);

		const onAbort = (): void => {
			clearTimeout(timer);
			reject(
				new SyncError("Sync cancelled", {
					code: SyncErrorCode.SYNC_CANCELLED,
					retryable: false,
				}),
			);
		};

		signal?.addEventListener("abort", onAbort, { once: true });
	});
}

/**
 * Executes an async function with exponential backoff retries.
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	policy: RetryPolicy,
	options?: {
		signal?: AbortSignal;
		onRetry?: (attempt: number, error: unknown) => void;
	},
): Promise<T> {
	let lastError: unknown;

	for (let attempt = 0; attempt < policy.maxAttempts; attempt += 1) {
		if (options?.signal?.aborted) {
			throw new SyncError("Sync cancelled", {
				code: SyncErrorCode.SYNC_CANCELLED,
				retryable: false,
			});
		}

		try {
			return await fn();
		} catch (error) {
			lastError = error;
			if (error instanceof SyncError && !error.retryable) {
				throw error;
			}
			if (attempt >= policy.maxAttempts - 1) {
				break;
			}
			options?.onRetry?.(attempt + 1, error);
			await sleep(computeDelayMs(policy, attempt), options?.signal);
		}
	}

	throw lastError;
}
