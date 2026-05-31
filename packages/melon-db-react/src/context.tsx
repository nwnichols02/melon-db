import type { MelonDatabase, MelonSchema } from "@melon/db";
import { createContext, useContext } from "react";

const DatabaseContext = createContext<MelonDatabase | null>(null);

export interface MelonDbProviderProps {
	db: MelonDatabase;
	children: React.ReactNode;
}

/**
 * Provides MelonDatabase to the React tree.
 */
export function MelonDbProvider({
	db,
	children,
}: MelonDbProviderProps): React.ReactElement {
	return (
		<DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
	);
}

/**
 * Returns the MelonDatabase from context.
 */
export function useDatabase<
	Schema extends MelonSchema = MelonSchema,
>(): MelonDatabase<Schema> {
	const db = useContext(DatabaseContext);
	if (!db) {
		throw new Error("useDatabase must be used within MelonDbProvider");
	}
	return db as MelonDatabase<Schema>;
}
