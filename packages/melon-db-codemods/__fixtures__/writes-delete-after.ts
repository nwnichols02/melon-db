await db.write(async (tx) => {
	const task = await tx.collection("tasks").insert({ title: "Hi" });
	await tx.collection("tasks").delete(task.id);
});
