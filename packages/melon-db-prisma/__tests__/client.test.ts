import { describe, expect, test } from "bun:test";
import {
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
} from "@melon-db/db";
import { createPrismaLikeClient } from "../src/client.ts";

const schema = createMelonSchema({
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
});

describe("createPrismaLikeClient", () => {
	test("findMany and create", async () => {
		const db = createDatabase({ schema, adapter: createInMemoryAdapter() });
		const prisma = createPrismaLikeClient(db);

		await prisma.tasks?.create({ data: { id: "1", status: "open" } });
		const rows = await prisma.tasks?.findMany({ where: { status: "open" } });
		expect(rows).toHaveLength(1);
	});
});
