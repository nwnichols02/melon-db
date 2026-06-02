import { describe, expect, test } from "bun:test";
import { MelonError, MelonErrorCode } from "@melon/db";
import {
	taskSchema,
	taskSchemaDefinition,
	withTestDatabase,
} from "@melon/db-testkit";
import {
	queryDescriptionToAst,
	translateWatermelonQuery,
} from "../src/compat/translate-query.ts";
import type { WatermelonQueryClause } from "../src/compat/types.ts";


describe("translateWatermelonQuery", () => {
	test("translates shorthand eq where", () => {
		const clauses: WatermelonQueryClause[] = [
			{ type: "where", field: "status", value: "open" },
		];
		const ast = translateWatermelonQuery("tasks", clauses);
		expect(ast.collection).toBe("tasks");
		expect(ast.where).toEqual({
			type: "predicate",
			predicate: { field: "status", op: "eq", value: "open" },
		});
	});

	test("translates nested and/or filters", () => {
		const clauses: WatermelonQueryClause[] = [
			{
				type: "where",
				field: "archived_at",
				op: "neq",
				value: null,
			},
			{
				type: "or",
				clauses: [
					{ type: "where", field: "is_verified", value: true },
					{
						type: "and",
						clauses: [
							{ type: "where", field: "likes", op: "gt", value: 10 },
							{ type: "where", field: "dislikes", op: "lt", value: 5 },
						],
					},
				],
			},
		];
		const ast = translateWatermelonQuery("comments", clauses);
		expect(ast.where?.type).toBe("and");
	});

	test("translates sort skip take", () => {
		const clauses: WatermelonQueryClause[] = [
			{ type: "sortBy", field: "likes", direction: "desc" },
			{ type: "sortBy", field: "dislikes", direction: "asc" },
			{ type: "skip", count: 50 },
			{ type: "take", count: 100 },
		];
		const ast = translateWatermelonQuery("comments", clauses);
		expect(ast.orderBy).toEqual([
			{ field: "likes", direction: "desc" },
			{ field: "dislikes", direction: "asc" },
		]);
		expect(ast.skip).toBe(50);
		expect(ast.limit).toBe(100);
	});

	test("rejects Q.on without schema", () => {
		const clauses: WatermelonQueryClause[] = [
			{
				type: "on",
				table: "projects",
				condition: { type: "where", field: "name", value: "Acme" },
			},
		];
		try {
			translateWatermelonQuery("tasks", clauses);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(MelonError);
			const melonError = error as MelonError;
			expect(melonError.code).toBe(MelonErrorCode.QUERY_INVALID);
			expect(melonError.remediation).toContain("MelonSchema");
		}
	});

	test("translates Q.on to relationFilters with schema", () => {
		const clauses: WatermelonQueryClause[] = [
			{
				type: "on",
				table: "projects",
				condition: { type: "where", field: "name", value: "Acme" },
			},
			{ type: "where", field: "status", value: "open" },
		];
		const ast = translateWatermelonQuery("tasks", clauses, taskSchema);
		expect(ast.relationFilters).toEqual([
			{
				relation: "project",
				where: {
					type: "predicate",
					predicate: { field: "name", op: "eq", value: "Acme" },
				},
			},
		]);
		expect(ast.where?.type).toBe("predicate");
	});

	test("executes Q.on translation on in-memory adapter", async () => {
		await withTestDatabase(taskSchemaDefinition, async ({ db }) => {
			await db.write(async (tx) => {
				await tx.collection("projects").insert({ id: "p1", name: "Acme" });
				await tx.collection("projects").insert({ id: "p2", name: "Other" });
				await tx.collection("tasks").insert({
					id: "t1",
					title: "A",
					status: "open",
					priority: 1,
					projectId: "p1",
					updatedAt: new Date(),
				});
				await tx.collection("tasks").insert({
					id: "t2",
					title: "B",
					status: "open",
					priority: 1,
					projectId: "p2",
					updatedAt: new Date(),
				});
			});

			const ast = translateWatermelonQuery(
				"tasks",
				[
					{
						type: "on",
						table: "projects",
						condition: { type: "where", field: "name", value: "Acme" },
					},
					{ type: "where", field: "status", value: "open" },
				],
				taskSchema,
			);
			const rows = await db.collection("tasks").findMany(ast);
			expect(rows).toHaveLength(1);
			expect(rows[0]?.id).toBe("t1");
		});
	});

	test("queryDescriptionToAst parses clause arrays", () => {
		const ast = queryDescriptionToAst("tasks", [
			{ type: "where", field: "status", value: "open" },
		]);
		expect(ast.collection).toBe("tasks");
	});

	test("executes translated AST on in-memory adapter", async () => {
		await withTestDatabase(
			{
				version: 1,
				collections: {
					tasks: {
						name: "tasks",
						primaryKey: "id",
						fields: {
							id: { kind: "string" },
							status: { kind: "string" },
						},
					},
				},
			},
			async ({ db }) => {
				await db.write(async (tx) => {
					await tx.collection("tasks").insert({ id: "1", status: "open" });
					await tx.collection("tasks").insert({ id: "2", status: "closed" });
				});

				const ast = translateWatermelonQuery("tasks", [
					{ type: "where", field: "status", value: "open" },
				]);
				const rows = await db.collection("tasks").findMany(ast);
				expect(rows).toHaveLength(1);
				expect(rows[0]?.id).toBe("1");
			},
		);
	});
});
