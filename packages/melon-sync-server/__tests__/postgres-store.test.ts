import { describe } from "bun:test";
import { SQL } from "bun";
import {
	createPostgresSyncStore,
	resetPostgresSyncData,
} from "../src/postgres-store.ts";
import { describeSyncBackendContract } from "./sync-backend.contract.ts";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("PostgresSyncStore", () => {
	describeSyncBackendContract(async () => {
		const url = databaseUrl as string;
		const sql = new SQL(url);
		await resetPostgresSyncData(sql);
		return createPostgresSyncStore(url, { runMigrations: false });
	});
});
