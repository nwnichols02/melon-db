import { describe } from "bun:test";
import { InMemorySyncStore } from "../src/store.ts";
import { describeSyncBackendContract } from "./sync-backend.contract.ts";

describe("InMemorySyncStore", () => {
	describeSyncBackendContract(async () => new InMemorySyncStore());
});
