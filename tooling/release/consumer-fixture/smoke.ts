import {
  createDatabase,
  createInMemoryAdapter,
  createMelonSchema,
} from "@melon-db/db";
import { createSqliteAdapter } from "@melon-db/db-sqlite";

const schema = createMelonSchema({
  version: 1,
  collections: {
    tasks: {
      name: "tasks",
      primaryKey: "id",
      fields: {
        id: { kind: "string" },
        title: { kind: "string" },
      },
    },
  },
});

const memoryDb = createDatabase({
  schema,
  adapter: createInMemoryAdapter(),
});

await memoryDb.write(async (tx) => {
  await tx.collection("tasks").insert({ id: "1", title: "packed tarball smoke" });
});

const rows = await memoryDb.collection("tasks").findMany();
if (rows.length !== 1 || rows[0]?.title !== "packed tarball smoke") {
  throw new Error("In-memory CRUD smoke failed");
}

const sqliteDb = createDatabase({
  schema,
  adapter: createSqliteAdapter({ filename: ":memory:" }),
});

await sqliteDb.write(async (tx) => {
  await tx.collection("tasks").insert({ id: "2", title: "sqlite smoke" });
});

const sqliteRows = await sqliteDb.collection("tasks").findMany();
if (sqliteRows.length !== 1) {
  throw new Error("SQLite CRUD smoke failed");
}

console.log("Consumer fixture smoke passed.");
