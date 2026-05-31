export const SyncServerErrorCode = {
	INVALID_PAYLOAD: "INVALID_PAYLOAD",
	UNSUPPORTED_COLLECTION: "UNSUPPORTED_COLLECTION",
} as const;

export type SyncServerErrorCode =
	(typeof SyncServerErrorCode)[keyof typeof SyncServerErrorCode];

export interface SyncServerErrorOptions {
	code: SyncServerErrorCode;
	status?: number;
}

/**
 * Error thrown when sync server receives invalid protocol payloads.
 */
export class SyncServerError extends Error {
	readonly code: SyncServerErrorCode;
	readonly status: number;

	constructor(message: string, options: SyncServerErrorOptions) {
		super(message);
		this.name = "SyncServerError";
		this.code = options.code;
		this.status = options.status ?? 400;
	}
}
