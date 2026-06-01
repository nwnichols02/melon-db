await db.write(async (tx) => {
	await tx.batch(
		database.get("tasks").prepareCreateFromDirtyRaw({ id: "1", title: "A" }),
	);
});
