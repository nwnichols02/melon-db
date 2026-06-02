import { describe, expect, test } from "bun:test";
import { createMelonSchema } from "@melon/db";
import { compilePrismaQuery } from "../src/compiler.ts";

const schema = createMelonSchema({
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				title: { kind: "string" },
				projectId: { kind: "string", nullable: true },
			},
			relations: {
				project: {
					kind: "belongsTo",
					target: "projects",
					foreignKey: "projectId",
				},
			},
		},
		projects: {
			name: "projects",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				name: { kind: "string" },
			},
		},
	},
});

describe("compilePrismaQuery", () => {
	test("maps select fields", () => {
		const prepared = compilePrismaQuery(
			"tasks",
			{ select: { id: true, title: true } },
			schema,
		);
		expect(prepared.ast.select?.fields).toEqual(["id", "title"]);
	});

	test("maps belongsTo include", () => {
		const prepared = compilePrismaQuery(
			"tasks",
			{ include: { project: true } },
			schema,
		);
		expect(prepared.ast.select?.include?.project).toEqual({
			relation: "project",
			where: undefined,
			orderBy: undefined,
			limit: undefined,
		});
	});
});
