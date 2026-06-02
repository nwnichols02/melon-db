import type { MelonSchema, PreparedQuery } from "@melon/db";
import { compileQuery } from "../sql/compile-query.ts";
import { resolveRelatedCollections } from "./related-collections.ts";

export interface QuerySubscriptionEntry {
	readonly id: number;
	readonly prepared: PreparedQuery;
	readonly collection: string;
	readonly relatedCollections: readonly string[];
	readonly listeners: Set<() => void>;
}

export interface QuerySubscriptionRegistry {
	setSchema(schema: MelonSchema): void;
	subscribe(prepared: PreparedQuery, onChange: () => void): () => void;
	getSubscriptionsForCollection(collection: string): QuerySubscriptionEntry[];
	getSubscriptionsAffectedByCollection(
		collection: string,
	): QuerySubscriptionEntry[];
	scheduleNotify(subscriptionId: number): void;
	clear(): void;
}

function subscriptionFingerprint(
	prepared: PreparedQuery,
	schema: MelonSchema,
): string {
	const compiled = compileQuery(prepared, schema);
	return `${prepared.ast.collection}\0${compiled.sql}\0${JSON.stringify(compiled.params)}`;
}

/**
 * Registry of active observeQuery subscriptions with fingerprint deduplication.
 */
export function createQuerySubscriptionRegistry(): QuerySubscriptionRegistry {
	let nextId = 1;
	let schema: MelonSchema | null = null;
	const byFingerprint = new Map<string, QuerySubscriptionEntry>();
	const byId = new Map<number, QuerySubscriptionEntry>();
	let pendingNotifyIds = new Set<number>();
	let flushScheduled = false;

	function requireSchema(): MelonSchema {
		if (!schema) {
			throw new Error(
				"QuerySubscriptionRegistry: schema not set; call setSchema after initialize",
			);
		}
		return schema;
	}

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
		setSchema(s: MelonSchema) {
			schema = s;
		},

		subscribe(prepared, onChange) {
			const s = requireSchema();
			const fingerprint = subscriptionFingerprint(prepared, s);
			let entry = byFingerprint.get(fingerprint);

			if (!entry) {
				const id = nextId++;
				entry = {
					id,
					prepared,
					collection: prepared.ast.collection,
					relatedCollections: resolveRelatedCollections(prepared.ast, s),
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

		getSubscriptionsAffectedByCollection(collection) {
			return [...byId.values()].filter(
				(e) =>
					e.collection === collection ||
					e.relatedCollections.includes(collection),
			);
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

export { subscriptionFingerprint };
