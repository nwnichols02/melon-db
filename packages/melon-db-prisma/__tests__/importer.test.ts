import { describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { createMelonSchema } from "@melon-db/db";
import { generateClient } from "../src/codegen/generate-client.ts";
import { importPrismaSchema } from "../src/importer/import-schema.ts";

const fixturePath = join(
	import.meta.dir,
	"../__fixtures__/sample.schema.prisma",
);

describe("importPrismaSchema", () => {
	test("maps models, fields, and relations", async () => {
		const schemaText = await Bun.file(fixturePath).text();
		const definition = await importPrismaSchema(schemaText);

		expect(definition.collections.tasks).toBeDefined();
		expect(definition.collections.tasks?.fields.title?.kind).toBe("string");
		expect(definition.collections.tasks?.fields.priority?.kind).toBe("number");
		expect(definition.collections.tasks?.relations?.project).toEqual({
			kind: "belongsTo",
			target: "projects",
			foreignKey: "projectId",
		});
		expect(definition.collections.projects?.relations?.tasks).toEqual({
			kind: "hasMany",
			target: "tasks",
			foreignKey: "projectId",
		});
	});

	test("round-trips into createMelonSchema", async () => {
		const schemaText = await Bun.file(fixturePath).text();
		const definition = await importPrismaSchema(schemaText);
		const schema = createMelonSchema(definition);
		expect(schema.getCollection("tasks").primaryKey).toBe("id");
	});
});

describe("generateClient", () => {
	test("writes generated files", async () => {
		const schemaText = await Bun.file(fixturePath).text();
		const definition = await importPrismaSchema(schemaText);
		const outputPath = join(import.meta.dir, "../.tmp/test-client");

		await rm(outputPath, { recursive: true, force: true });
		await generateClient(definition, { outputPath, emitHooks: true });

		expect(await Bun.file(`${outputPath}/schema.ts`).exists()).toBe(true);
		expect(await Bun.file(`${outputPath}/client.ts`).exists()).toBe(true);
		expect(await Bun.file(`${outputPath}/hooks.ts`).exists()).toBe(true);

		await rm(outputPath, { recursive: true, force: true });
	});
});
