import latestArtifact from "@/data/bench-rn-latest.json";

interface RnMelonVsWdbRow {
	scenario: string;
	scale: number;
	melonMs: number;
	watermelonMs: number;
	ratio: number;
	winner: "melon" | "watermelon" | "tie";
}

interface RnMelonVsWdbReport {
	timestamp: string;
	scale: number;
	platform: string;
	melonEngine: string;
	comparisons: RnMelonVsWdbRow[];
	notes?: string[];
}

interface BenchRnMelonWdbArtifact {
	generatedAt: string;
	updatedBy: string;
	note?: string;
	device: {
		platform: string;
		label: string;
	};
	melonVsWdb?: RnMelonVsWdbReport;
}

const artifact = latestArtifact as BenchRnMelonWdbArtifact;

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

interface MelonWdbWinnerBadgeProps {
	winner: RnMelonVsWdbRow["winner"];
}

function MelonWdbWinnerBadge({ winner }: MelonWdbWinnerBadgeProps) {
	const className =
		winner === "melon"
			? "rounded-md bg-fd-primary/15 px-2 py-0.5 text-xs font-medium text-fd-primary"
			: winner === "watermelon"
				? "rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300"
				: "rounded-md bg-fd-muted px-2 py-0.5 text-xs font-medium text-fd-muted-foreground";

	return <span className={className}>{winner}</span>;
}

interface MelonWdbResultsTableProps {
	rows: RnMelonVsWdbRow[];
	melonEngine: string;
}

function MelonWdbResultsTable({ rows, melonEngine }: MelonWdbResultsTableProps) {
	if (rows.length === 0) {
		return (
			<p className="text-fd-muted-foreground text-sm">
				No Melon vs WatermelonDB results in the artifact. Run{" "}
				<strong>jsi-sync + Watermelon</strong> in{" "}
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
						<th className="px-4 py-2 font-medium text-right">{melonEngine}</th>
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
								{formatMs(row.melonMs)}
							</td>
							<td className="px-4 py-2 text-right tabular-nums">
								{formatMs(row.watermelonMs)}
							</td>
							<td className="px-4 py-2 text-right tabular-nums">
								{row.ratio.toFixed(4)}
							</td>
							<td className="px-4 py-2">
								<MelonWdbWinnerBadge winner={row.winner} />
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

/**
 * Renders on-device melon-jsi-sync vs WatermelonDB metrics from bench-rn-latest.json.
 */
export function BenchRnMelonWdbResultsTable() {
	const melonVsWdb = artifact.melonVsWdb;
	const { device } = artifact;

	if (!melonVsWdb) {
		return (
			<p className="text-fd-muted-foreground not-prose text-sm">
				No <code className="text-fd-foreground">melonVsWdb</code> block in{" "}
				<code className="text-fd-foreground">bench-rn-latest.json</code> yet.
			</p>
		);
	}

	return (
		<div className="not-prose flex flex-col gap-4">
			<p className="text-fd-muted-foreground text-sm">
				Captured{" "}
				<time dateTime={melonVsWdb.timestamp}>
					{formatGeneratedAt(melonVsWdb.timestamp)} UTC
				</time>
				{device.label ? (
					<>
						{" "}
						· Device: <span className="text-fd-foreground">{device.label}</span> (
						{device.platform})
					</>
				) : null}
				. Ratio is {melonVsWdb.melonEngine} ÷ watermelon (&lt; 1 means Melon
				faster).
			</p>

			<section className="flex flex-col gap-3">
				<h3 className="text-lg font-semibold">
					{formatScale(melonVsWdb.scale)} rows · {melonVsWdb.melonEngine} vs
					watermelon
				</h3>
				<MelonWdbResultsTable
					rows={melonVsWdb.comparisons}
					melonEngine={melonVsWdb.melonEngine}
				/>
			</section>
		</div>
	);
}
