import { Q } from "@nozbe/watermelondb";
import { withObservables } from "@nozbe/watermelondb/react";

function TaskList({ tasks }: { tasks: unknown[] }) {
	return null;
}

const Enhanced = withObservables(["tasks"], ({ database }) => ({
	tasks: database.get("tasks").query(Q.where("status", "open")).observe(),
}))(TaskList);

export default Enhanced;
