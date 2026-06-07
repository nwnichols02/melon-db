import { type ReactElement, useState } from "react";
import { useMelonDevtools, useMelonDevtoolsLog } from "./devtools-context.tsx";
import { ErrorsTab } from "./tabs/errors-tab";
import { QueriesTab } from "./tabs/queries-tab";
import { SubscriptionsTab } from "./tabs/subscriptions-tab";
import { SyncTab } from "./tabs/sync-tab";
import { RetentionTab } from "./tabs/retention-tab";
import { WritesTab } from "./tabs/writes-tab";

const TabKind = {
	Queries: "queries",
	Writes: "writes",
	Sync: "sync",
	Subs: "subs",
	Errors: "errors",
	Retention: "retention",
} as const;

type TabKind = (typeof TabKind)[keyof typeof TabKind];

const TABS: Array<{ id: TabKind; label: string }> = [
	{ id: TabKind.Queries, label: "Queries" },
	{ id: TabKind.Writes, label: "Writes" },
	{ id: TabKind.Sync, label: "Sync" },
	{ id: TabKind.Subs, label: "Subs" },
	{ id: TabKind.Errors, label: "Errors" },
	{ id: TabKind.Retention, label: "Retention" },
];

/**
 * Web devtools inspector drawer for query, write, and sync diagnostics.
 */
export function MelonDevtoolsPanel(): ReactElement {
	const { bridge } = useMelonDevtools();
	const log = useMelonDevtoolsLog();
	const [open, setOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<TabKind>(TabKind.Queries);

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				style={{
					background: "#111",
					border: "none",
					borderRadius: 8,
					bottom: 16,
					color: "#fff",
					cursor: "pointer",
					fontSize: 14,
					fontWeight: 600,
					padding: "10px 14px",
					position: "fixed",
					right: 16,
					zIndex: 9999,
				}}
			>
				Melon-db
			</button>
			{open ? (
				<div
					style={{
						background: "#fff",
						borderLeft: "1px solid #ddd",
						bottom: 0,
						boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
						display: "flex",
						flexDirection: "column",
						position: "fixed",
						right: 0,
						top: 0,
						width: 420,
						zIndex: 9998,
					}}
				>
					<div
						style={{
							alignItems: "center",
							borderBottom: "1px solid #eee",
							display: "flex",
							justifyContent: "space-between",
							padding: "12px 16px",
						}}
					>
						<strong>Melon-db Devtools</strong>
						<div style={{ display: "flex", gap: 8 }}>
							<button
								type="button"
								onClick={() => bridge.clear()}
								style={{
									background: "#f5f5f5",
									border: "1px solid #ddd",
									borderRadius: 6,
									cursor: "pointer",
									padding: "4px 8px",
								}}
							>
								Clear
							</button>
							<button
								type="button"
								onClick={() => setOpen(false)}
								style={{
									background: "none",
									border: "none",
									cursor: "pointer",
									fontSize: 18,
								}}
							>
								×
							</button>
						</div>
					</div>
					<div
						style={{
							borderBottom: "1px solid #eee",
							display: "flex",
							gap: 4,
							padding: "8px 12px",
						}}
					>
						{TABS.map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => setActiveTab(tab.id)}
								style={{
									background: activeTab === tab.id ? "#111" : "#f5f5f5",
									border: "none",
									borderRadius: 6,
									color: activeTab === tab.id ? "#fff" : "#333",
									cursor: "pointer",
									fontSize: 12,
									padding: "6px 10px",
								}}
							>
								{tab.label}
							</button>
						))}
					</div>
					<div style={{ flex: 1, overflow: "auto", padding: 16 }}>
						{activeTab === TabKind.Queries ? (
							<QueriesTab queries={log.queries} />
						) : null}
						{activeTab === TabKind.Writes ? (
							<WritesTab writes={log.writes} />
						) : null}
						{activeTab === TabKind.Sync ? <SyncTab sync={log.sync} /> : null}
						{activeTab === TabKind.Subs ? (
							<SubscriptionsTab subscriptions={log.subscriptions} />
						) : null}
						{activeTab === TabKind.Errors ? (
							<ErrorsTab errors={log.errors} />
						) : null}
						{activeTab === TabKind.Retention ? <RetentionTab /> : null}
					</div>
				</div>
			) : null}
		</>
	);
}
