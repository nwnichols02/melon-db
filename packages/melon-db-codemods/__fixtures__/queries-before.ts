import { Q } from "@nozbe/watermelondb";

database
	.get("tasks")
	.query(Q.where("status", "open"), Q.sortBy("priority", Q.desc), Q.take(20));
