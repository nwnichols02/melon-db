import { Q } from "@nozbe/watermelondb";

database.get("tasks").query(
	Q.on("projects", Q.where("name", "Acme")),
	Q.where("status", "open"),
);
