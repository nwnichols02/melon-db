import {
	MelonDevtoolsPanel,
	MelonDevtoolsProvider,
} from "@melon/db-devtools/react";
import { MelonDbProvider, useFluentQuery, useWriter } from "@melon/db-react";
import { type ReactElement, useCallback, useMemo, useState } from "react";
import { db, devtoolsBridge } from "./db/bootstrap.ts";
import type { Task } from "./db/schema.ts";
/**
 * Web playground: in-memory CRUD, fluent query, and devtools panel.
 */
export function App(): ReactElement {
	return (
		<MelonDbProvider db={db}>
			<MelonDevtoolsProvider bridge={devtoolsBridge}>
				<TaskPlayground />
				<MelonDevtoolsPanel />
			</MelonDevtoolsProvider>
		</MelonDbProvider>
	);
}

function TaskPlayground(): ReactElement {
	const write = useWriter();
	const [title, setTitle] = useState("");

	const openTasks = useFluentQuery<Task>(
		"tasks",
		(b) => b.where("status", "eq", "open").orderBy("title", "asc"),
	);

	const openCount = useMemo(() => openTasks.length, [openTasks]);

	const handleAdd = useCallback(async () => {
		const trimmed = title.trim();
		if (!trimmed) {
			return;
		}
		await write(async (tx) => {
			await tx.collection("tasks").insert({
				id: crypto.randomUUID(),
				title: trimmed,
				status: "open",
			});
		});
		setTitle("");
	}, [title, write]);

	const handleComplete = useCallback(
		async (id: string) => {
			await write(async (tx) => {
				await tx.collection("tasks").update(id, { status: "done" });
			});
		},
		[write],
	);

	const handleSeed = useCallback(async () => {
		await write(async (tx) => {
			const col = tx.collection("tasks");
			for (let i = 0; i < 3; i++) {
				await col.insert({
					id: crypto.randomUUID(),
					title: `Sample ${i + 1}`,
					status: "open",
				});
			}
		});
	}, [write]);

	return (
		<main className="app">
			<h1>Melon web playground</h1>
			<p className="muted">
				In-memory database · fluent query · open Melon DB devtools (bottom-right)
				for Plan and AST
			</p>
			<p className="muted">Open tasks: {openCount}</p>
			<div className="row">
				<input
					onChange={(event) => setTitle(event.target.value)}
					onKeyDown={(event) => {
						if (event.key === "Enter") {
							void handleAdd();
						}
					}}
					placeholder="New task title"
					value={title}
				/>
				<button onClick={() => void handleAdd()} type="button">
					Add
				</button>
				<button onClick={() => void handleSeed()} type="button">
					Seed
				</button>
			</div>
			{openTasks.length === 0 ? (
				<p className="muted">No open tasks.</p>
			) : (
				<ul className="task-list">
					{openTasks.map((task) => (
						<li key={task.id}>
							<span>{task.title}</span>
							<button onClick={() => void handleComplete(task.id)} type="button">
								Done
							</button>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
