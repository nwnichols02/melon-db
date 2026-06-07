import { Q } from "@nozbe/watermelondb";
import { withObservables } from "@melon-db/db-react";

function TaskList({ tasks }: { tasks: unknown[] }) {
	return null;
}

/* @melon-codemod withObservables → hooks
 * Replace HOC with hooks inside the component body:
 * const tasks = useFindMany('tasks'); // was: database.get('tasks').query(Q.where("status", "open")).observe()
 * import { useFindMany } from '@melon-db/db-react';
 * See /docs/migration#withobservables
 */
export default TaskList;
