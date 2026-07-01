import { BreakdownTable } from "@/components/BreakdownTable";
import { PeriodPicker } from "@/components/PeriodPicker";
import { resolvePeriod, type PeriodSearchParams } from "@/lib/analytics/period-params";
import { getCustomerBreakdown } from "@/lib/analytics/queries";

export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<PeriodSearchParams> }) {
  const params = await searchParams;
  const period = resolvePeriod(params);
  const rows = await getCustomerBreakdown(period);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Sales by Customer</h1>
        <p className="text-sm text-black/60 dark:text-white/60">Ranked by revenue for the selected period.</p>
      </div>
      <PeriodPicker basePath="/customers" period={period} />
      <BreakdownTable rows={rows} nameHeader="Customer" />
    </div>
  );
}
