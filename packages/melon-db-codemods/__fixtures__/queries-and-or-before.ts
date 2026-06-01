import { Q } from "@nozbe/watermelondb";

database
	.get("tasks")
	.query(
		Q.and(Q.where("status", "open"), Q.or(Q.where("priority", Q.gte(2)), Q.where("priority", Q.lt(1)))),
		Q.sortBy("updated_at", Q.desc),
	);
await database
	.get("tasks")
	.query(Q.where("status", "open"))
	.fetch();
await database.get("tasks").query(Q.where("status", "open")).observe();
