import { type ReactElement, useEffect, useState } from "react";

/**
 * Client-only wrapper so sync demo modules are not evaluated during SSR.
 */
export function ClientSyncPlayground(): ReactElement {
	const [Playground, setPlayground] = useState<React.ComponentType | null>(
		null,
	);

	useEffect(() => {
		void import("./sync-playground").then((module) => {
			setPlayground(() => module.SyncPlayground);
		});
	}, []);

	if (!Playground) {
		return <p className="text-fd-muted-foreground">Loading playground…</p>;
	}

	return <Playground />;
}
