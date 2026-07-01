import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { BreakdownRow } from "@/lib/analytics/queries";

export function BreakdownTable({
  rows,
  nameHeader,
  showQuantity,
}: {
  rows: BreakdownRow[];
  nameHeader: string;
  showQuantity?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-black/60 dark:text-white/60">No sales in this period yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left text-black/60 dark:border-white/10 dark:text-white/60">
            <th className="px-4 py-3 font-medium">{nameHeader}</th>
            {showQuantity && <th className="px-4 py-3 font-medium text-right">Units</th>}
            <th className="px-4 py-3 font-medium text-right">Orders</th>
            <th className="px-4 py-3 font-medium text-right">Revenue</th>
            <th className="px-4 py-3 font-medium text-right">vs prev period</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id ?? row.name} className="border-b border-black/5 last:border-0 dark:border-white/5">
              <td className="px-4 py-3">
                <div className="font-medium">{row.name}</div>
                {row.secondary && <div className="text-xs text-black/50 dark:text-white/50">{row.secondary}</div>}
              </td>
              {showQuantity && <td className="px-4 py-3 text-right">{formatNumber(row.quantity ?? 0)}</td>}
              <td className="px-4 py-3 text-right">{formatNumber(row.orderCount)}</td>
              <td className="px-4 py-3 text-right font-medium">{formatCurrency(row.revenue)}</td>
              <td className={`px-4 py-3 text-right ${row.changePct !== null && row.changePct < 0 ? "text-red-600" : row.changePct !== null ? "text-emerald-600" : "text-black/40 dark:text-white/40"}`}>
                {formatPercent(row.changePct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
