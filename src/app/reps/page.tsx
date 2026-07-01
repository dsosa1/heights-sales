import { BreakdownTable } from "@/components/BreakdownTable";
import { PeriodPicker } from "@/components/PeriodPicker";
import { resolvePeriod, type PeriodSearchParams } from "@/lib/analytics/period-params";
import { getRepBreakdown } from "@/lib/analytics/queries";

export const dynamic = "force-dynamic";

export default async function RepsPage({ searchParams }: { searchParams: Promise<PeriodSearchParams> }) {
  const params = await searchParams;
  const period = resolvePeriod(params);
  const rows = await getRepBreakdown(period);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Sales by Rep</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Ranked by revenue for the selected period. Orders with more than one sales rep are credited in full to each rep, so totals across reps can exceed overall revenue.
        </p>
      </div>
      <PeriodPicker basePath="/reps" period={period} />
      <BreakdownTable rows={rows} nameHeader="Rep" />
    </div>
  );
}
