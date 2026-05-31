import { DatabaseProvider, useDatabase } from "@nozbe/watermelondb/react";

export function App({ children }: { children: React.ReactNode }) {
	const database = useDatabase();
	return <DatabaseProvider database={database}>{children}</DatabaseProvider>;
}
