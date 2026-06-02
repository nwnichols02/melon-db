import type { ReactElement } from "react";

/**
 * Placeholder for prd-4 sliding-window retention diagnostics (Phase 31+).
 */
export function RetentionTab(): ReactElement {
	return (
		<div>
			<p style={{ color: "#666", margin: 0 }}>
				Sliding window retention (local prune ledger, window policies, pressure
				modes) is planned in prd-4. Sync pull/push remains the source of scope;
				pruning is a separate client subsystem.
			</p>
		</div>
	);
}
