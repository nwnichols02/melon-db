import type { SyncChanges } from "@melon-db/db";
import type { PullArgs, PushArgs } from "@melon-db/sync";
import { SyncServerError, SyncServerErrorCode } from "./errors.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSyncChangeSet(value: unknown): value is {
	created: unknown[];
	updated: unknown[];
	deleted: unknown[];
} {
	if (!isRecord(value)) {
		return false;
	}
	return (
		Array.isArray(value.created) &&
		Array.isArray(value.updated) &&
		Array.isArray(value.deleted)
	);
}

/**
 * Validates Watermelon-shaped sync changes payload.
 */
export function validateSyncChanges(changes: unknown): SyncChanges {
	if (!isRecord(changes)) {
		throw new SyncServerError("changes must be an object", {
			code: SyncServerErrorCode.INVALID_PAYLOAD,
		});
	}

	const result: SyncChanges = {};
	for (const [collection, changeSet] of Object.entries(changes)) {
		if (!isSyncChangeSet(changeSet)) {
			throw new SyncServerError(
				`Invalid change set for collection "${collection}"`,
				{ code: SyncServerErrorCode.INVALID_PAYLOAD },
			);
		}
		result[collection] = {
			created: changeSet.created as SyncChanges[string]["created"],
			updated: changeSet.updated as SyncChanges[string]["updated"],
			deleted: changeSet.deleted as string[],
		};
	}
	return result;
}

/**
 * Validates pull request body.
 */
export function validatePullBody(
	body: unknown,
	options?: { maxSchemaVersion?: number },
): PullArgs {
	if (!isRecord(body)) {
		throw new SyncServerError("Invalid pull payload", {
			code: SyncServerErrorCode.INVALID_PAYLOAD,
		});
	}

	const lastPulledAt =
		body.lastPulledAt === null || body.lastPulledAt === undefined
			? null
			: Number(body.lastPulledAt);
	if (lastPulledAt !== null && !Number.isFinite(lastPulledAt)) {
		throw new SyncServerError("lastPulledAt must be a number or null", {
			code: SyncServerErrorCode.INVALID_PAYLOAD,
		});
	}

	const schemaVersion = Number(body.schemaVersion);
	if (!Number.isFinite(schemaVersion)) {
		throw new SyncServerError("schemaVersion must be a number", {
			code: SyncServerErrorCode.INVALID_PAYLOAD,
		});
	}

	if (
		options?.maxSchemaVersion !== undefined &&
		schemaVersion > options.maxSchemaVersion
	) {
		throw new SyncServerError(
			`Client schema version ${schemaVersion} exceeds server max ${options.maxSchemaVersion}`,
			{ code: SyncServerErrorCode.SCHEMA_VERSION_UNSUPPORTED },
		);
	}

	const migration =
		body.migration && isRecord(body.migration)
			? {
					from: Number(body.migration.from),
					tables: Array.isArray(body.migration.tables)
						? (body.migration.tables as string[])
						: [],
					columns: Array.isArray(body.migration.columns)
						? (body.migration.columns as Array<{
								table: string;
								columns: string[];
							}>)
						: [],
				}
			: undefined;

	return { lastPulledAt, schemaVersion, migration };
}

/**
 * Validates push request body.
 */
export function validatePushBody(body: unknown): PushArgs {
	if (!isRecord(body)) {
		throw new SyncServerError("Invalid push payload", {
			code: SyncServerErrorCode.INVALID_PAYLOAD,
		});
	}

	const lastPulledAt = Number(body.lastPulledAt);
	if (!Number.isFinite(lastPulledAt)) {
		throw new SyncServerError("lastPulledAt must be a number", {
			code: SyncServerErrorCode.INVALID_PAYLOAD,
		});
	}

	return {
		changes: validateSyncChanges(body.changes),
		lastPulledAt,
	};
}

/**
 * Validates pull result timestamp before HTTP response.
 */
export function validatePullResultTimestamp(timestamp: unknown): number {
	const value = Number(timestamp);
	if (!Number.isFinite(value)) {
		throw new SyncServerError("timestamp must be a finite number", {
			code: SyncServerErrorCode.INVALID_PAYLOAD,
		});
	}
	return value;
}
