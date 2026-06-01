import { describe, expect, test } from "bun:test";
import { mergeRemoteWithPendingFields } from "../src/sync/merge-remote-record.ts";

describe("mergeRemoteWithPendingFields", () => {
	test("overlays pending fields onto remote for disjoint edits", () => {
		const merged = mergeRemoteWithPendingFields({
			local: { id: "1", title: "Local title", status: "open" },
			remote: { id: "1", title: "Remote title", status: "done" },
			pendingFields: { title: "Local title" },
			primaryKey: "id",
		});
		expect(merged.title).toBe("Local title");
		expect(merged.status).toBe("done");
	});

	test("pending field wins when both changed same field", () => {
		const merged = mergeRemoteWithPendingFields({
			local: { id: "1", title: "Local title" },
			remote: { id: "1", title: "Remote title" },
			pendingFields: { title: "Local title" },
			primaryKey: "id",
		});
		expect(merged.title).toBe("Local title");
	});

	test("mergeProtectedFields keeps remote values", () => {
		const merged = mergeRemoteWithPendingFields({
			local: { id: "1", title: "Local", _updated_at: 100 },
			remote: { id: "1", title: "Remote", _updated_at: 200 },
			pendingFields: { title: "Local" },
			primaryKey: "id",
			mergeProtectedFields: ["_updated_at"],
		});
		expect(merged.title).toBe("Local");
		expect(merged._updated_at).toBe(200);
	});

	test("uses remote when no local row", () => {
		const merged = mergeRemoteWithPendingFields({
			local: null,
			remote: { id: "1", title: "Remote", status: "open" },
			primaryKey: "id",
		});
		expect(merged).toEqual({ id: "1", title: "Remote", status: "open" });
	});

	test("mergeRemoteFields limits remote field application", () => {
		const merged = mergeRemoteWithPendingFields({
			local: { id: "1", title: "Local", status: "open", priority: 1 },
			remote: { id: "1", title: "Remote", status: "done", priority: 9 },
			pendingFields: { title: "Local" },
			primaryKey: "id",
			mergeRemoteFields: ["status"],
		});
		expect(merged.title).toBe("Local");
		expect(merged.status).toBe("done");
		expect(merged.priority).toBe(1);
	});
});
