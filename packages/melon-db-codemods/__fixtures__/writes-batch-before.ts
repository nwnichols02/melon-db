await database.write(async () => {
	await database.batch(
		database.get("tasks").prepareCreateFromDirtyRaw({ id: "1", title: "A" }),
	);
});
