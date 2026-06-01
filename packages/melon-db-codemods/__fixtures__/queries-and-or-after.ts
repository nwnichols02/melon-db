import { createQueryFactory } from "@melon/db-query";
const q = createQueryFactory(schema);
import { Q } from "@nozbe/watermelondb";

db.collection("tasks").findMany(q.from("tasks").and(q2 => q2.where("status", "eq", "open").or(q2 => q2.where("priority", "gte", 2).where("priority", "lt", 1))).orderBy("updated_at", "desc").toAst());
await db.collection("tasks").query(q.from("tasks").where("status", "eq", "open").toAst()).fetch();
await db.collection("tasks").query(q.from("tasks").where("status", "eq", "open").toAst()).observe();
