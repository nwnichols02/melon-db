import { createDatabase, createMelonSchema } from "@melon/db";
import { createQueryFactory } from "@melon/db-query";
import { createSqliteAdapter } from "@melon/db-sqlite";

const schema = createMelonSchema({
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				title: { kind: "string" },
				status: { kind: "string" },
				priority: { kind: "number" },
			},
		},
	},
});

const db = createDatabase({
	schema,
	adapter: createSqliteAdapter({ filename: ":memory:" }),
});

await db.write(async (tx) => {
	await tx.collection("tasks").insert({
		id: "1",
		title: "Learn Melon",
		status: "open",
		priority: 1,
	});
	await tx.collection("tasks").insert({
		id: "2",
		title: "Ship playground",
		status: "open",
		priority: 2,
	});
});

const q = createQueryFactory(schema);
const ast = q
	.from<{ status: string }>("tasks")
	.where("status", "eq", "open")
	.orderBy("priority", "desc")
	.toAst();

const rows = await db.collection("tasks").findMany(ast);

console.log("Open tasks (fluent query via @melon/db-query):");
for (const row of rows) {
	console.log(`  - [${row.priority}] ${row.title} (${row.id})`);
}

await db.adapter.close();
