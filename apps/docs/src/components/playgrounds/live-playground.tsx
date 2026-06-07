import {
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
} from "@melon-db/db";
import { createReactiveDevtoolsBridge } from "@melon-db/db-devtools";
import {
	MelonDevtoolsPanel,
	MelonDevtoolsProvider,
} from "@melon-db/db-devtools/react";
import { createQueryFactory } from "@melon-db/db-query";
import { MelonDbProvider, useQuery, useWriter } from "@melon-db/db-react";
import { type ReactElement, useCallback, useMemo, useState } from "react";

const demoSchema = createMelonSchema({
	version: 1,
	collections: {
		tasks: {
			name: "tasks",
			primaryKey: "id",
			fields: {
				id: { kind: "string" },
				title: { kind: "string" },
				status: { kind: "string" },
			},
		},
	},
});

interface Task extends Record<string, unknown> {
	id: string;
	title: string;
	status: string;
}

const bridge = createReactiveDevtoolsBridge();
const db = createDatabase({
	schema: demoSchema,
	adapter: createInMemoryAdapter(),
	devtools: bridge,
});

/**
 * Interactive CRUD demo with embedded devtools panel.
 */
export function LivePlayground(): ReactElement {
	return (
		<MelonDbProvider db={db}>
			<MelonDevtoolsProvider bridge={bridge}>
				<DemoTaskList />
				<MelonDevtoolsPanel />
			</MelonDevtoolsProvider>
		</MelonDbProvider>
	);
}

function DemoTaskList(): ReactElement {
	const write = useWriter();
	const [title, setTitle] = useState("");

	const openTasksQuery = useMemo(
		() =>
			createQueryFactory(demoSchema)
				.from<Task>("tasks")
				.where("status", "eq", "open")
				.toAst(),
		[],
	);

	const tasks = useQuery<Task>(openTasksQuery);

	const handleAdd = useCallback(async () => {
		if (!title.trim()) {
			return;
		}
		await write(async (tx) => {
			await tx.collection("tasks").insert({
				id: crypto.randomUUID(),
				title: title.trim(),
				status: "open",
			});
		});
		setTitle("");
	}, [title, write]);

	const handleComplete = useCallback(
		async (id: string) => {
			await write(async (tx) => {
				await tx.collection("tasks").update(id, { status: "closed" });
			});
		},
		[write],
	);

	return (
		<div className="rounded-xl border border-fd-border bg-fd-card p-5">
			<h2 className="mt-0 text-xl font-semibold">Live playground</h2>
			<p className="text-fd-muted-foreground">
				In-memory Melon-db database with reactive queries. Open Melon-db devtools
				(bottom-right) to inspect Plan, AST, and writes.
			</p>
			<div className="mb-4 flex gap-2">
				<input
					className="flex-1 rounded-md border border-fd-border px-3 py-2"
					onChange={(event) => setTitle(event.target.value)}
					placeholder="New task title"
					value={title}
				/>
				<button
					className="rounded-md bg-fd-primary px-4 py-2 text-fd-primary-foreground"
					onClick={() => void handleAdd()}
					type="button"
				>
					Add
				</button>
			</div>
			{tasks.length === 0 ? (
				<p className="text-fd-muted-foreground">No open tasks.</p>
			) : (
				<ul className="m-0 list-none p-0">
					{tasks.map((task) => (
						<li
							className="flex items-center justify-between border-b border-fd-border py-2"
							key={task.id}
						>
							<span>{task.title}</span>
							<button
								className="rounded-md border border-fd-border px-2 py-1 text-sm"
								onClick={() => void handleComplete(task.id)}
								type="button"
							>
								Complete
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
