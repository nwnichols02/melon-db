import { type ReactElement, useEffect, useState } from "react";

/**
 * Client-only wrapper so in-memory DB modules are not evaluated during SSR.
 */
export function ClientLivePlayground(): ReactElement {
	const [Playground, setPlayground] = useState<React.ComponentType | null>(
		null,
	);

	useEffect(() => {
		void import("./live-playground").then((module) => {
			setPlayground(() => module.LivePlayground);
		});
	}, []);

	if (!Playground) {
		return <p className="text-fd-muted-foreground">Loading playground…</p>;
	}

	return <Playground />;
}
