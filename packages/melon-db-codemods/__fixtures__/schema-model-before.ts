import { Model } from "@nozbe/watermelondb";
import { field, relation, date, readonly } from "@nozbe/watermelondb/decorators";

export class Task extends Model {
	static table = "tasks";

	@field("title") title!: string;
	@field("status") status!: string;
	@date("updated_at") updatedAt!: Date;
	@readonly @date("created_at") createdAt!: Date;
	@relation("projects", { foreignKey: "project_id" }) project!: Model;
}
