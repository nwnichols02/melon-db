await database.write(async () => {
	const task = await database.get("tasks").create((t) => {
		t.title = "Hi";
	});
	await task.update(() => {
		task.status = "done";
	});
});
