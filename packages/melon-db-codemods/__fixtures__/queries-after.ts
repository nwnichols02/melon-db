import { createQueryFactory } from "@melon/db-query";
const q = createQueryFactory(schema);
import { Q } from "@nozbe/watermelondb";

db.collection("tasks").findMany(q.from("tasks").where("status", "eq", "open").orderBy("priority", "desc").limit(20).toAst());
