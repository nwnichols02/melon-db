import { createQueryFactory } from "@melon/db-query";
const q = createQueryFactory(schema);
import { Q } from "@nozbe/watermelondb";

/* @melon-codemod Q.on — manual migration required
 * Melon v1 does not support Watermelon Q.on joins. Rewrite queries on "tasks" that filter via "projects".
 * - Add a belongsTo relation on "tasks" pointing to "projects" (foreign key: projects_id).
 * - Replace Q.on('projects', ...) with .include('projects', { where: ... }) when the filter targets related fields.
 * - Alternatively: query "projects" first, collect ids, then filter "tasks" with Q.where / .where('projects_id', 'in', ids).
 * - See /docs/migration#q-on for a full before/after example.
 * Example:
 *   q.from('tasks')
 *   .include('projects', { where: ... })
 *   .toAst()
 */
db.collection("tasks").findMany(q.from("tasks").where("status", "eq", "open").toAst());
