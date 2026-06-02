import latestArtifact from "@/data/bench-rn-latest.json";

interface RnCompareRow {
	scenario: string;
	scale: number;
	jsiSyncMs: number;
	turboMs: number;
	ratio: number;
	winner: "jsi-sync" | "turbo" | "tie";
}

interface RnParityReport {
	timestamp: string;
	scale: number;
	platform: string;
	modes: string[];
	comparisons: RnCompareRow[];
	notes?: string[];
}

interface BenchRnLatestArtifact {
	generatedAt: string;
	updatedBy: string;
	note?: string;
	device: {
		platform: string;
		label: string;
	};
	report: RnParityReport;
}

const artifact = latestArtifact as BenchRnLatestArtifact;

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

interface RnWinnerBadgeProps {
	winner: RnCompareRow["winner"];
}

function RnWinnerBadge({ winner }: RnWinnerBadgeProps) {
	const className =
		winner === "jsi-sync"
			? "rounded-md bg-fd-primary/15 px-2 py-0.5 text-xs font-medium text-fd-primary"
			: winner === "turbo"
				? "rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-800 dark:text-violet-300"
				: "rounded-md bg-fd-muted px-2 py-0.5 text-xs font-medium text-fd-muted-foreground";

	return <span className={className}>{winner}</span>;
}

interface RnResultsTableProps {
	rows: RnCompareRow[];
}

function RnResultsTable({ rows }: RnResultsTableProps) {
	if (rows.length === 0) {
		return (
			<p className="text-fd-muted-foreground text-sm">
				No on-device results in the artifact. Run{" "}
				<strong>jsi-sync + turbo</strong> in{" "}
				<code className="text-fd-foreground">playground-rn-dev</code> →
				Benchmarks and update{" "}
				<code className="text-fd-foreground">bench-rn-latest.json</code>.
			</p>
		);
	}

	return (
		<div className="overflow-x-auto rounded-lg border border-fd-border">
			<table className="w-full min-w-[36rem] border-collapse text-sm">
				<thead>
					<tr className="border-b border-fd-border bg-fd-muted/50 text-left">
						<th className="px-4 py-2 font-medium">Scenario</th>
						<th className="px-4 py-2 font-medium text-right">jsi-sync</th>
						<th className="px-4 py-2 font-medium text-right">turbo</th>
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
								{formatMs(row.jsiSyncMs)}
							</td>
							<td className="px-4 py-2 text-right tabular-nums">
								{formatMs(row.turboMs)}
							</td>
							<td className="px-4 py-2 text-right tabular-nums">
								{row.ratio.toFixed(4)}
							</td>
							<td className="px-4 py-2">
								<RnWinnerBadge winner={row.winner} />
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

/**
 * Renders on-device jsi-sync vs turbo metrics from bench-rn-latest.json.
 */
export function BenchRnResultsTable() {
	const { report, device } = artifact;

	return (
		<div className="not-prose flex flex-col gap-4">
			<p className="text-fd-muted-foreground text-sm">
				Captured{" "}
				<time dateTime={artifact.generatedAt}>
					{formatGeneratedAt(artifact.generatedAt)} UTC
				</time>{" "}
				via <code className="text-fd-foreground">{artifact.updatedBy}</code>.
				{device.label ? (
					<>
						{" "}
						Device: <span className="text-fd-foreground">{device.label}</span> (
						{device.platform}).
					</>
				) : null}{" "}
				Ratio is jsi-sync ÷ turbo (&lt; 1 means jsi-sync faster).
			</p>

			{artifact.note ? (
				<p className="text-fd-muted-foreground text-sm">{artifact.note}</p>
			) : null}

			<section className="flex flex-col gap-3">
				<h3 className="text-lg font-semibold">
					{formatScale(report.scale)} rows · {report.modes.join(" vs ")}
				</h3>
				<RnResultsTable rows={report.comparisons} />
			</section>
		</div>
	);
}
