import { PeriodPicker } from "@/components/PeriodPicker";
import { StatCard } from "@/components/StatCard";
import { TrendChart } from "@/components/TrendChart";
import { resolvePeriod, type PeriodSearchParams } from "@/lib/analytics/period-params";
import { trailingPeriods } from "@/lib/analytics/periods";
import { getOverallComparison, getTrend } from "@/lib/analytics/queries";
import { formatCurrency, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OverviewPage({ searchParams }: { searchParams: Promise<PeriodSearchParams> }) {
  const params = await searchParams;
  const period = resolvePeriod(params);
  const comparison = await getOverallComparison(period);
  const trend = await getTrend(trailingPeriods(12, period));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Revenue counts orders with status: {process.env.LEAFLINK_COUNTED_STATUSES ?? "Submitted, Accepted, Fulfilled, Completed"}.
        </p>
      </div>

      <PeriodPicker basePath="/overview" period={period} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatCurrency(comparison.current.revenue)}
          vsPreviousPct={comparison.vsPreviousPct}
          vsYearAgoPct={comparison.vsYearAgoPct}
        />
        <StatCard label="Orders" value={formatNumber(comparison.current.orderCount)} />
        <StatCard label="Active customers" value={formatNumber(comparison.current.customerCount)} />
        <StatCard label="Avg order value" value={formatCurrency(comparison.current.avgOrderValue)} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">Trailing 12 {period.granularity}s</h2>
        <TrendChart data={trend} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-black/10 p-5 text-sm dark:border-white/10">
          <div className="text-black/60 dark:text-white/60">Previous period ({comparison.previous.label})</div>
          <div className="mt-1 text-lg font-medium">{formatCurrency(comparison.previousTotals.revenue)}</div>
        </div>
        <div className="rounded-xl border border-black/10 p-5 text-sm dark:border-white/10">
          <div className="text-black/60 dark:text-white/60">Same period last year ({comparison.yearAgo.label})</div>
          <div className="mt-1 text-lg font-medium">{formatCurrency(comparison.yearAgoTotals.revenue)}</div>
        </div>
      </div>
    </div>
  );
}
