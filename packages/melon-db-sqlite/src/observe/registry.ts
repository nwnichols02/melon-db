import type { PreparedQuery, QueryBooleanNode } from "@melon/db";
import { compileQuery } from "../sql/compile-query.ts";

export interface QuerySubscriptionEntry {
	readonly id: number;
	readonly prepared: PreparedQuery;
	readonly collection: string;
	readonly where: QueryBooleanNode | undefined;
	readonly listeners: Set<() => void>;
}

export interface QuerySubscriptionRegistry {
	subscribe(prepared: PreparedQuery, onChange: () => void): () => void;
	getSubscriptionsForCollection(collection: string): QuerySubscriptionEntry[];
	scheduleNotify(subscriptionId: number): void;
	clear(): void;
}

function subscriptionFingerprint(prepared: PreparedQuery): string {
	const compiled = compileQuery(prepared);
	return `${prepared.ast.collection}\0${compiled.sql}\0${JSON.stringify(compiled.params)}`;
}

/**
 * Registry of active observeQuery subscriptions with fingerprint deduplication.
 */
export function createQuerySubscriptionRegistry(): QuerySubscriptionRegistry {
	let nextId = 1;
	const byFingerprint = new Map<string, QuerySubscriptionEntry>();
	const byId = new Map<number, QuerySubscriptionEntry>();
	let pendingNotifyIds = new Set<number>();
	let flushScheduled = false;

	function flushNotifications(): void {
		const ids = pendingNotifyIds;
		pendingNotifyIds = new Set();
		flushScheduled = false;
		for (const id of ids) {
			const entry = byId.get(id);
			if (!entry) continue;
			for (const listener of entry.listeners) {
				listener();
			}
		}
	}

	return {
		subscribe(prepared, onChange) {
			const fingerprint = subscriptionFingerprint(prepared);
			let entry = byFingerprint.get(fingerprint);

			if (!entry) {
				const id = nextId++;
				entry = {
					id,
					prepared,
					collection: prepared.ast.collection,
					where: prepared.ast.where,
					listeners: new Set(),
				};
				byFingerprint.set(fingerprint, entry);
				byId.set(id, entry);
			}

			entry.listeners.add(onChange);

			return () => {
				entry.listeners.delete(onChange);
				if (entry.listeners.size === 0) {
					byFingerprint.delete(fingerprint);
					byId.delete(entry.id);
				}
			};
		},

		getSubscriptionsForCollection(collection) {
			return [...byId.values()].filter((e) => e.collection === collection);
		},

		scheduleNotify(subscriptionId) {
			pendingNotifyIds.add(subscriptionId);
			if (!flushScheduled) {
				flushScheduled = true;
				queueMicrotask(flushNotifications);
			}
		},

		clear() {
			byFingerprint.clear();
			byId.clear();
			pendingNotifyIds.clear();
			flushScheduled = false;
		},
	};
}
