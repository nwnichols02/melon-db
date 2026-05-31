import { describe, expect, test } from "bun:test";
import { SyncError, SyncErrorCode } from "../src/errors.ts";
import { DEFAULT_RETRY_POLICY, withRetry } from "../src/retry.ts";

describe("withRetry", () => {
	test("succeeds on third attempt after two failures", async () => {
		let calls = 0;
		const retries: number[] = [];

		const result = await withRetry(
			async () => {
				calls += 1;
				if (calls < 3) {
					throw new Error("transient");
				}
				return "ok";
			},
			{ ...DEFAULT_RETRY_POLICY, baseDelayMs: 1, maxDelayMs: 2, jitter: false },
			{
				onRetry: (attempt) => {
					retries.push(attempt);
				},
			},
		);

		expect(result).toBe("ok");
		expect(calls).toBe(3);
		expect(retries).toEqual([1, 2]);
	});

	test("throws SYNC_CANCELLED when aborted during backoff", async () => {
		const controller = new AbortController();
		let calls = 0;

		const promise = withRetry(
			async () => {
				calls += 1;
				if (calls === 1) {
					controller.abort();
					throw new Error("fail");
				}
				return "ok";
			},
			{
				...DEFAULT_RETRY_POLICY,
				baseDelayMs: 50,
				maxDelayMs: 50,
				jitter: false,
			},
			{ signal: controller.signal },
		);

		await expect(promise).rejects.toMatchObject({
			code: SyncErrorCode.SYNC_CANCELLED,
		});
	});

	test("does not retry non-retryable SyncError", async () => {
		let calls = 0;

		await expect(
			withRetry(async () => {
				calls += 1;
				throw new SyncError("nope", {
					code: SyncErrorCode.SYNC_SCHEMA_MISMATCH,
					retryable: false,
				});
			}, DEFAULT_RETRY_POLICY),
		).rejects.toMatchObject({ code: SyncErrorCode.SYNC_SCHEMA_MISMATCH });

		expect(calls).toBe(1);
	});
});
