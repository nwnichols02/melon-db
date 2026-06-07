import { describe, expect, test } from "bun:test";
import {
	and,
	createMelonSchema,
	predicate,
	prepareQuery,
	queryAst,
} from "@melon-db/db";
import { taskSchemaDefinition } from "../../../melon-db/__fixtures__/task-schema.ts";
import { shouldInvalidateSubscription } from "./invalidation.ts";
import { collectObservationFields } from "./predicate-fields.ts";
import {
	createQuerySubscriptionRegistry,
	subscriptionFingerprint,
} from "./registry.ts";

const schema = createMelonSchema(taskSchemaDefinition);

describe("collectObservationFields", () => {
	test("includes where, orderBy, and relation FK fields", () => {
		const ast = queryAst("tasks", {
			where: predicate("status", "eq", "open"),
			orderBy: [{ field: "priority", direction: "desc" }],
			relationFilters: [
				{
					relation: "project",
					where: predicate("name", "eq", "Acme"),
				},
			],
		});

		const fields = collectObservationFields(ast, schema);
		expect(fields.has("status")).toBe(true);
		expect(fields.has("priority")).toBe(true);
		expect(fields.has("projectId")).toBe(true);
		expect(fields.has("name")).toBe(false);
	});
});

describe("shouldInvalidateSubscription", () => {
	const acmeTasksQuery = prepareQuery(
		queryAst("tasks", {
			where: predicate("status", "eq", "open"),
			relationFilters: [
				{
					relation: "project",
					where: predicate("name", "eq", "Acme"),
				},
			],
		}),
		schema,
	);

	const lookup = async (collection: string, pk: string | number) => {
		if (collection === "projects" && pk === "p1") {
			return { id: "p1", name: "Acme" };
		}
		if (collection === "projects" && pk === "p2") {
			return { id: "p2", name: "Other" };
		}
		return null;
	};

	test("related project rename invalidates task subscription", async () => {
		const registry = createQuerySubscriptionRegistry();
		registry.setSchema(schema);
		registry.subscribe(acmeTasksQuery, () => {});
		const entry = registry.getSubscriptionsForCollection("tasks")[0];
		if (!entry) {
			throw new Error("missing subscription");
		}

		const shouldInvalidate = await shouldInvalidateSubscription(
			entry,
			{
				collection: "projects",
				operation: "update",
				oldRow: { id: "p1", name: "Acme" },
				newRow: { id: "p1", name: "Renamed" },
			},
			schema,
			lookup,
		);

		expect(shouldInvalidate).toBe(true);
	});

	test("task priority-only update does not invalidate", async () => {
		const registry = createQuerySubscriptionRegistry();
		registry.setSchema(schema);
		registry.subscribe(acmeTasksQuery, () => {});
		const entry = registry.getSubscriptionsForCollection("tasks")[0];
		if (!entry) {
			throw new Error("missing subscription");
		}

		const taskRow = {
			id: "t1",
			title: "A",
			status: "open",
			priority: 1,
			projectId: "p1",
			updatedAt: new Date(),
		};

		const shouldInvalidate = await shouldInvalidateSubscription(
			entry,
			{
				collection: "tasks",
				operation: "update",
				oldRow: taskRow,
				newRow: { ...taskRow, priority: 2 },
			},
			schema,
			lookup,
		);

		expect(shouldInvalidate).toBe(false);
	});

	test("closed task insert does not invalidate open+acme query", async () => {
		const registry = createQuerySubscriptionRegistry();
		registry.setSchema(schema);
		registry.subscribe(acmeTasksQuery, () => {});
		const entry = registry.getSubscriptionsForCollection("tasks")[0];
		if (!entry) {
			throw new Error("missing subscription");
		}

		const shouldInvalidate = await shouldInvalidateSubscription(
			entry,
			{
				collection: "tasks",
				operation: "insert",
				newRow: {
					id: "t2",
					title: "B",
					status: "closed",
					priority: 1,
					projectId: "p1",
					updatedAt: new Date(),
				},
			},
			schema,
			lookup,
		);

		expect(shouldInvalidate).toBe(false);
	});
});

describe("subscriptionFingerprint", () => {
	test("differs when relationFilters differ", () => {
		const base = prepareQuery(
			queryAst("tasks", { where: predicate("status", "eq", "open") }),
			schema,
		);
		const withFilter = prepareQuery(
			queryAst("tasks", {
				where: predicate("status", "eq", "open"),
				relationFilters: [
					{
						relation: "project",
						where: and(predicate("name", "eq", "Acme")),
					},
				],
			}),
			schema,
		);

		expect(subscriptionFingerprint(base, schema)).not.toBe(
			subscriptionFingerprint(withFilter, schema),
		);
	});
});
