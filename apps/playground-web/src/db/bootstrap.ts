import { createDatabase, createInMemoryAdapter } from "@melon/db";
import { createReactiveDevtoolsBridge } from "@melon/db-devtools";
import { taskSchema } from "./schema.ts";

export const devtoolsBridge = createReactiveDevtoolsBridge();

export const db = createDatabase({
	schema: taskSchema,
	adapter: createInMemoryAdapter(),
	devtools: devtoolsBridge,
});
