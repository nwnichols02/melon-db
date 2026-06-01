import latestArtifact from "@/data/bench-compare-latest.json";

interface CompareRow {
	scenario: string;
	scale: number;
	melonNodeMs: number;
	watermelonMs: number;
	ratio: number;
	winner: "melon" | "watermelon" | "tie";
}

interface ParityReportSnapshot {
	timestamp: string;
	scale: number;
	comparisons: CompareRow[];
	notes?: string[];
}

interface MelonBunRow {
	engine: string;
	scale: number;
	scenario: string;
	durationMs: number;
	rowCount?: number;
	resultCount?: number;
}

interface BenchCompareLatestArtifact {
	generatedAt: string;
	updatedBy: string;
	scales: number[];
	reports: ParityReportSnapshot[];
	melonBun?: MelonBunRow[];
}

const artifact = latestArtifact as BenchCompareLatestArtifact;

const SCENARIO_LABELS: Record<string, string> = {
	"row-insert": "Row insert",
	"batch-insert": "Batch insert",
	"filtered-query": "Filtered query",
	"count-query": "Count query",
	"find-by-id": "Find by id",
};

function formatMs(ms: number): string {
	return `${ms.toFixed(2)} ms`;
}

function formatScale(scale: number): string {
	return scale.toLocaleString("en-US");
}

function formatGeneratedAt(iso: string): string {
	return new Date(iso).toLocaleString("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "UTC",
	});
}

interface WinnerBadgeProps {
	winner: CompareRow["winner"];
}

function WinnerBadge({ winner }: WinnerBadgeProps) {
	const className =
		winner === "melon"
			? "rounded-md bg-fd-primary/15 px-2 py-0.5 text-xs font-medium text-fd-primary"
			: winner === "watermelon"
				? "rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300"
				: "rounded-md bg-fd-muted px-2 py-0.5 text-xs font-medium text-fd-muted-foreground";

	return <span className={className}>{winner}</span>;
}

interface ResultsTableProps {
	rows: CompareRow[];
}

function ResultsTable({ rows }: ResultsTableProps) {
	if (rows.length === 0) {
		return (
			<p className="text-fd-muted-foreground text-sm">
				No paired results in the artifact. Run{" "}
				<code className="text-fd-foreground">bun run bench:compare:docs</code>{" "}
				with better-sqlite3 available.
			</p>
		);
	}

	return (
		<div className="overflow-x-auto rounded-lg border border-fd-border">
			<table className="w-full min-w-[36rem] border-collapse text-sm">
				<thead>
					<tr className="border-b border-fd-border bg-fd-muted/50 text-left">
						<th className="px-4 py-2 font-medium">Scenario</th>
						<th className="px-4 py-2 font-medium text-right">melon-node</th>
						<th className="px-4 py-2 font-medium text-right">watermelon</th>
						<th className="px-4 py-2 font-medium text-right">Ratio</th>
						<th className="px-4 py-2 font-medium">Winner</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr
							key={row.scenario}
							className="border-b border-fd-border last:border-0"
						>
							<td className="px-4 py-2 font-medium">
								{SCENARIO_LABELS[row.scenario] ?? row.scenario}
							</td>
							<td className="px-4 py-2 text-right tabular-nums">
								{formatMs(row.melonNodeMs)}
							</td>
							<td className="px-4 py-2 text-right tabular-nums">
								{formatMs(row.watermelonMs)}
							</td>
							<td className="px-4 py-2 text-right tabular-nums">
								{row.ratio.toFixed(4)}
							</td>
							<td className="px-4 py-2">
								<WinnerBadge winner={row.winner} />
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

interface MelonBunTableProps {
	rows: MelonBunRow[];
}

function MelonBunTable({ rows }: MelonBunTableProps) {
	if (rows.length === 0) {
		return null;
	}

	return (
		<div className="overflow-x-auto rounded-lg border border-fd-border">
			<table className="w-full min-w-[24rem] border-collapse text-sm">
				<thead>
					<tr className="border-b border-fd-border bg-fd-muted/50 text-left">
						<th className="px-4 py-2 font-medium">Scenario</th>
						<th className="px-4 py-2 font-medium text-right">Duration</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr
							key={row.scenario}
							className="border-b border-fd-border last:border-0"
						>
							<td className="px-4 py-2 font-medium">
								{SCENARIO_LABELS[row.scenario] ?? row.scenario}
							</td>
							<td className="px-4 py-2 text-right tabular-nums">
								{formatMs(row.durationMs)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

/**
 * Renders parity metrics from the committed bench-compare-latest.json artifact.
 */
export function BenchCompareResultsTable() {
	return (
		<div className="not-prose flex flex-col gap-8">
			<p className="text-fd-muted-foreground text-sm">
				Last updated{" "}
				<time dateTime={artifact.generatedAt}>
					{formatGeneratedAt(artifact.generatedAt)} UTC
				</time>{" "}
				via <code className="text-fd-foreground">{artifact.updatedBy}</code>.
				Ratio is melon-node ÷ watermelon (&lt; 1 means Melon faster).
			</p>

			{artifact.reports.map((report) => (
				<section key={report.scale} className="flex flex-col gap-3">
					<h3 className="text-lg font-semibold">
						{formatScale(report.scale)} rows
					</h3>
					<ResultsTable rows={report.comparisons} />
				</section>
			))}

			{artifact.melonBun && artifact.melonBun.length > 0 ? (
				<section className="flex flex-col gap-3">
					<h3 className="text-lg font-semibold">melon-bun (reference)</h3>
					<p className="text-fd-muted-foreground text-sm">
						Same scenarios on <code>bun:sqlite</code> — not compared to
						WatermelonDB.
					</p>
					<MelonBunTable rows={artifact.melonBun} />
				</section>
			) : null}
		</div>
	);
}
