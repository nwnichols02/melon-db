export const SyncErrorCode = {
	SYNC_PULL_FAILED: "SYNC_PULL_FAILED",
	SYNC_PUSH_FAILED: "SYNC_PUSH_FAILED",
	SYNC_APPLY_FAILED: "SYNC_APPLY_FAILED",
	SYNC_NOT_ENABLED: "SYNC_NOT_ENABLED",
} as const;

export type SyncErrorCode = (typeof SyncErrorCode)[keyof typeof SyncErrorCode];

export interface SyncErrorOptions {
	code: SyncErrorCode;
	retryable?: boolean;
	cause?: unknown;
	remediation?: string;
}

/**
 * Structured error for sync orchestration failures.
 */
export class SyncError extends Error {
	readonly code: SyncErrorCode;
	readonly retryable: boolean;
	readonly remediation?: string;

	constructor(message: string, options: SyncErrorOptions) {
		super(message);
		this.name = "SyncError";
		this.code = options.code;
		this.retryable = options.retryable ?? false;
		this.remediation = options.remediation;
		if (options.cause !== undefined) {
			this.cause = options.cause;
		}
	}
}
