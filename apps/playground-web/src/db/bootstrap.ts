import { createDatabase, createInMemoryAdapter } from "@melon-db/db";
import { createReactiveDevtoolsBridge } from "@melon-db/db-devtools";
import { taskSchema } from "./schema.ts";

export const devtoolsBridge = createReactiveDevtoolsBridge();

export const db = createDatabase({
	schema: taskSchema,
	adapter: createInMemoryAdapter(),
	devtools: devtoolsBridge,
});
