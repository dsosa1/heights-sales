import { BreakdownTable } from "@/components/BreakdownTable";
import { PeriodPicker } from "@/components/PeriodPicker";
import { resolvePeriod, type PeriodSearchParams } from "@/lib/analytics/period-params";
import { getSkuBreakdown } from "@/lib/analytics/queries";

export const dynamic = "force-dynamic";

export default async function SkusPage({ searchParams }: { searchParams: Promise<PeriodSearchParams> }) {
  const params = await searchParams;
  const period = resolvePeriod(params);
  const rows = await getSkuBreakdown(period);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Sales by SKU</h1>
        <p className="text-sm text-black/60 dark:text-white/60">Ranked by revenue for the selected period.</p>
      </div>
      <PeriodPicker basePath="/skus" period={period} />
      <BreakdownTable rows={rows} nameHeader="Product" showQuantity />
    </div>
  );
}
