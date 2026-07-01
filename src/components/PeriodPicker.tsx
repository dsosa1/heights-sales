import Link from "next/link";
import { nextPeriod, previousPeriod, type Period } from "@/lib/analytics/periods";
import { periodToQuery } from "@/lib/analytics/period-params";

function hrefFor(basePath: string, query: Record<string, string>): string {
  const params = new URLSearchParams(query);
  return `${basePath}?${params.toString()}`;
}

export function PeriodPicker({ basePath, period }: { basePath: string; period: Period }) {
  const granularities: { key: "month" | "quarter" | "year"; label: string }[] = [
    { key: "month", label: "Month" },
    { key: "quarter", label: "Quarter" },
    { key: "year", label: "Year" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1 rounded-lg border border-black/10 p-1 text-sm dark:border-white/10">
        {granularities.map((g) => {
          const query = periodToQuery(period, g.key);
          const active = g.key === period.granularity;
          return (
            <Link
              key={g.key}
              href={hrefFor(basePath, query)}
              className={`rounded-md px-3 py-1 ${active ? "bg-foreground text-background" : "text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"}`}
            >
              {g.label}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <Link href={hrefFor(basePath, periodToQuery(previousPeriod(period)))} className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white" aria-label="Previous period">
          ← Prev
        </Link>
        <span className="min-w-[10ch] text-center font-medium">{period.label}</span>
        <Link href={hrefFor(basePath, periodToQuery(nextPeriod(period)))} className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white" aria-label="Next period">
          Next →
        </Link>
      </div>
    </div>
  );
}
