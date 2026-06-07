import { MelonDbProvider, useDatabase } from "@melon-db/db-react";

export function App({ children }: { children: React.ReactNode }) {
	const database = useDatabase();
	return <MelonDbProvider db={database}>{children}</MelonDbProvider>;
}
