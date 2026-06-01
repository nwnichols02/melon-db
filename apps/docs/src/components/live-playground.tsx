import {
	createDatabase,
	createInMemoryAdapter,
	createMelonSchema,
} from "@melon/db";
import { createReactiveDevtoolsBridge } from "@melon/db-devtools";
import {
	MelonDevtoolsPanel,
	MelonDevtoolsProvider,
} from "@melon/db-devtools/react";
import { createQueryFactory } from "@melon/db-query";
import { MelonDbProvider, useQuery, useWriter } from "@melon/db-react";
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

interface Task {
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
		<div
			style={{
				background: "#fff",
				border: "1px solid #ddd",
				borderRadius: 12,
				padding: 20,
			}}
		>
			<h2 style={{ marginTop: 0 }}>Live playground</h2>
			<p style={{ color: "#666" }}>
				In-memory Melon database with reactive queries. Open the Melon DB
				devtools panel (bottom-right) to inspect AST and writes.
			</p>
			<div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
				<input
					onChange={(event) => setTitle(event.target.value)}
					placeholder="New task title"
					style={{
						border: "1px solid #ccc",
						borderRadius: 6,
						flex: 1,
						padding: "8px 12px",
					}}
					value={title}
				/>
				<button
					onClick={() => void handleAdd()}
					style={{
						background: "#111",
						border: "none",
						borderRadius: 6,
						color: "#fff",
						cursor: "pointer",
						padding: "8px 16px",
					}}
					type="button"
				>
					Add
				</button>
			</div>
			{tasks.length === 0 ? (
				<p style={{ color: "#666" }}>No open tasks.</p>
			) : (
				<ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
					{tasks.map((task) => (
						<li
							key={task.id}
							style={{
								alignItems: "center",
								borderBottom: "1px solid #eee",
								display: "flex",
								justifyContent: "space-between",
								padding: "10px 0",
							}}
						>
							<span>{task.title}</span>
							<button
								onClick={() => void handleComplete(task.id)}
								style={{
									background: "#f5f5f5",
									border: "1px solid #ddd",
									borderRadius: 6,
									cursor: "pointer",
									padding: "4px 10px",
								}}
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
