import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

export type SqlParam = string | number | boolean | null;

export interface Spec extends TurboModule {
	open(path: string): Promise<void>;
	close(): Promise<void>;
	exec(sql: string): Promise<void>;
	queryAll(
		sql: string,
		params: ReadonlyArray<SqlParam>,
	): Promise<ReadonlyArray<Record<string, unknown>>>;
	queryFirst(
		sql: string,
		params: ReadonlyArray<SqlParam>,
	): Promise<Record<string, unknown> | null>;
	run(sql: string, params: ReadonlyArray<SqlParam>): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("MelonSQLite");
