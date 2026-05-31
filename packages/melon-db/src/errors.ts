export const MelonErrorCode = {
	SCHEMA_INVALID: "SCHEMA_INVALID",
	QUERY_INVALID: "QUERY_INVALID",
	WRITE_OUTSIDE_TRANSACTION: "WRITE_OUTSIDE_TRANSACTION",
	RECORD_NOT_FOUND: "RECORD_NOT_FOUND",
	ADAPTER_ERROR: "ADAPTER_ERROR",
	NOT_INITIALIZED: "NOT_INITIALIZED",
} as const;

export type MelonErrorCode =
	(typeof MelonErrorCode)[keyof typeof MelonErrorCode];

export interface MelonErrorOptions {
	code: MelonErrorCode;
	retryable?: boolean;
	cause?: unknown;
	remediation?: string;
}

/**
 * Structured error for database, query, and adapter failures.
 */
export class MelonError extends Error {
	readonly code: MelonErrorCode;
	readonly retryable: boolean;
	readonly remediation?: string;

	constructor(message: string, options: MelonErrorOptions) {
		super(message);
		this.name = "MelonError";
		this.code = options.code;
		this.retryable = options.retryable ?? false;
		this.remediation = options.remediation;
		if (options.cause !== undefined) {
			this.cause = options.cause;
		}
	}
}
