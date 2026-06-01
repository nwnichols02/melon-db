import type { SyncRecord } from "./types.ts";

/**
 * Merges a remote sync record with locally pending field patches.
 */
export function mergeRemoteWithPendingFields(args: {
	local: SyncRecord | null;
	remote: SyncRecord;
	pendingFields?: Record<string, unknown>;
	primaryKey: string;
	mergeRemoteFields?: string[];
	mergeProtectedFields?: string[];
}): SyncRecord {
	const {
		local,
		remote,
		pendingFields,
		primaryKey,
		mergeRemoteFields,
		mergeProtectedFields,
	} = args;
	const protectedSet = new Set(mergeProtectedFields ?? []);
	const pending = pendingFields ?? {};
	const pendingKeys = new Set(Object.keys(pending));
	const remoteFieldList =
		mergeRemoteFields ??
		Object.keys(remote).filter((key) => key !== primaryKey);

	const merged: SyncRecord = local ? { ...local } : { ...remote };

	for (const field of remoteFieldList) {
		if (field === primaryKey) {
			continue;
		}
		if (protectedSet.has(field)) {
			continue;
		}
		if (pendingKeys.has(field)) {
			continue;
		}
		if (field in remote) {
			merged[field] = remote[field];
		}
	}

	for (const [field, value] of Object.entries(pending)) {
		if (field === primaryKey || protectedSet.has(field)) {
			continue;
		}
		merged[field] = value;
	}

	for (const field of protectedSet) {
		if (field in remote) {
			merged[field] = remote[field];
		}
	}

	const id = remote[primaryKey] ?? local?.[primaryKey];
	if (id !== undefined && id !== null) {
		merged[primaryKey] = id;
	}

	return merged;
}
