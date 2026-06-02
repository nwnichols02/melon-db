import { describe, expect, test } from "bun:test";
import {
	createMelonSchema,
	predicate,
	prepareQuery,
	queryAst,
} from "@melon/db";
import { taskSchemaDefinition } from "../../../melon-db/__fixtures__/task-schema.ts";
import type { SqliteDriver } from "../driver.ts";
import { createQuerySubscriptionRegistry } from "./registry.ts";
import { invalidateForObservationEvents } from "./invalidate-events.ts";
import type { ObservationEvent } from "./triggers.ts";

const schema = createMelonSchema(taskSchemaDefinition);

function createMockDriver(rows: Record<string, Record<string, unknown>>): SqliteDriver {
	return {
		async exec() {},
		async queryAll() {
			return [];
		},
		async queryFirst(_sql, params) {
			const id = params[0];
			const row = rows[String(id)];
			return row ?? null;
		},
		async run() {},
		async transaction(fn) {
			return fn();
		},
		async close() {},
	};
}

describe("invalidateForObservationEvents", () => {
	test("insert event notifies matching subscription", async () => {
		const registry = createQuerySubscriptionRegistry();
		let notified = false;
		registry.subscribe(
			prepareQuery(
				queryAst("tasks", { where: predicate("status", "eq", "open") }),
				schema,
			),
			() => {
				notified = true;
			},
		);

		const driver = createMockDriver({
			"t1": {
				id: "t1",
				title: "Open",
				status: "open",
				priority: 1,
				updatedAt: new Date(),
			},
		});

		const events: ObservationEvent[] = [
			{ collection: "tasks", recordId: "t1", operation: "insert" },
		];

		await invalidateForObservationEvents(driver, schema, registry, events);
		await new Promise((r) => setTimeout(r, 0));
		expect(notified).toBe(true);
	});

	test("insert event skips irrelevant subscription", async () => {
		const registry = createQuerySubscriptionRegistry();
		let notified = false;
		registry.subscribe(
			prepareQuery(
				queryAst("tasks", { where: predicate("status", "eq", "open") }),
				schema,
			),
			() => {
				notified = true;
			},
		);

		const driver = createMockDriver({
			"t1": {
				id: "t1",
				title: "Closed",
				status: "closed",
				priority: 1,
				updatedAt: new Date(),
			},
		});

		await invalidateForObservationEvents(driver, schema, registry, [
			{ collection: "tasks", recordId: "t1", operation: "insert" },
		]);
		await new Promise((r) => setTimeout(r, 0));
		expect(notified).toBe(false);
	});

	test("delete event notifies all subscriptions on collection", async () => {
		const registry = createQuerySubscriptionRegistry();
		let openNotified = false;
		let closedNotified = false;
		registry.subscribe(
			prepareQuery(
				queryAst("tasks", { where: predicate("status", "eq", "open") }),
				schema,
			),
			() => {
				openNotified = true;
			},
		);
		registry.subscribe(
			prepareQuery(
				queryAst("tasks", { where: predicate("status", "eq", "closed") }),
				schema,
			),
			() => {
				closedNotified = true;
			},
		);

		const driver = createMockDriver({});

		await invalidateForObservationEvents(driver, schema, registry, [
			{ collection: "tasks", recordId: "t1", operation: "delete" },
		]);
		await new Promise((r) => setTimeout(r, 0));
		expect(openNotified).toBe(true);
		expect(closedNotified).toBe(true);
	});
});
