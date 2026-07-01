import { formatPercent } from "@/lib/format";

function ChangeBadge({ label, value }: { label: string; value: number | null }) {
  const tone = value === null ? "text-black/40 dark:text-white/40" : value >= 0 ? "text-emerald-600" : "text-red-600";
  return (
    <span className="text-xs">
      <span className="text-black/40 dark:text-white/40">{label} </span>
      <span className={tone}>{formatPercent(value)}</span>
    </span>
  );
}

export function StatCard({
  label,
  value,
  vsPreviousPct,
  vsYearAgoPct,
}: {
  label: string;
  value: string;
  vsPreviousPct?: number | null;
  vsYearAgoPct?: number | null;
}) {
  return (
    <div className="rounded-xl border border-black/10 p-5 dark:border-white/10">
      <div className="text-sm text-black/60 dark:text-white/60">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {(vsPreviousPct !== undefined || vsYearAgoPct !== undefined) && (
        <div className="mt-3 flex gap-4">
          {vsPreviousPct !== undefined && <ChangeBadge label="vs prev" value={vsPreviousPct} />}
          {vsYearAgoPct !== undefined && <ChangeBadge label="vs last yr" value={vsYearAgoPct} />}
        </div>
      )}
    </div>
  );
}
