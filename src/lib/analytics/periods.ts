export type Granularity = "month" | "quarter" | "year" | "custom";

export interface Period {
  start: Date; // inclusive, UTC
  end: Date; // exclusive, UTC
  label: string;
  granularity: Granularity;
}

function utc(year: number, monthIndex: number, day = 1): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

export function monthPeriod(year: number, month: number): Period {
  const start = utc(year, month - 1, 1);
  const end = utc(year, month, 1);
  const label = start.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  return { start, end, label, granularity: "month" };
}

export function quarterPeriod(year: number, quarter: number): Period {
  const startMonth = (quarter - 1) * 3;
  const start = utc(year, startMonth, 1);
  const end = utc(year, startMonth + 3, 1);
  return { start, end, label: `Q${quarter} ${year}`, granularity: "quarter" };
}

export function yearPeriod(year: number): Period {
  return { start: utc(year, 0, 1), end: utc(year + 1, 0, 1), label: String(year), granularity: "year" };
}

export function customPeriod(start: Date, end: Date): Period {
  return {
    start,
    end,
    label: `${start.toISOString().slice(0, 10)} – ${end.toISOString().slice(0, 10)}`,
    granularity: "custom",
  };
}

export function currentPeriod(granularity: Exclude<Granularity, "custom">, now = new Date()): Period {
  const year = now.getUTCFullYear();
  if (granularity === "month") return monthPeriod(year, now.getUTCMonth() + 1);
  if (granularity === "quarter") return quarterPeriod(year, Math.floor(now.getUTCMonth() / 3) + 1);
  return yearPeriod(year);
}

/** The immediately preceding period of the same length (e.g. June for a July month period). */
export function previousPeriod(period: Period): Period {
  switch (period.granularity) {
    case "month":
      return monthPeriod(period.start.getUTCFullYear(), period.start.getUTCMonth()); // month is 1-indexed input, so this steps back one
    case "quarter": {
      const prevStart = utc(period.start.getUTCFullYear(), period.start.getUTCMonth() - 3, 1);
      return quarterPeriod(prevStart.getUTCFullYear(), Math.floor(prevStart.getUTCMonth() / 3) + 1);
    }
    case "year":
      return yearPeriod(period.start.getUTCFullYear() - 1);
    default: {
      const durationMs = period.end.getTime() - period.start.getTime();
      const end = period.start;
      const start = new Date(period.start.getTime() - durationMs);
      return customPeriod(start, end);
    }
  }
}

/** The same period one year earlier (e.g. July 2025 for a July 2026 month period). */
export function yearAgoPeriod(period: Period): Period {
  switch (period.granularity) {
    case "month":
      return monthPeriod(period.start.getUTCFullYear() - 1, period.start.getUTCMonth() + 1);
    case "quarter":
      return quarterPeriod(period.start.getUTCFullYear() - 1, Math.floor(period.start.getUTCMonth() / 3) + 1);
    case "year":
      return yearPeriod(period.start.getUTCFullYear() - 1);
    default: {
      const start = utc(period.start.getUTCFullYear() - 1, period.start.getUTCMonth(), period.start.getUTCDate());
      const end = utc(period.end.getUTCFullYear() - 1, period.end.getUTCMonth(), period.end.getUTCDate());
      return customPeriod(start, end);
    }
  }
}

/** The period immediately following this one (same length). */
export function nextPeriod(period: Period): Period {
  switch (period.granularity) {
    case "month":
      return monthPeriod(period.start.getUTCFullYear(), period.start.getUTCMonth() + 2);
    case "quarter": {
      const nextStart = utc(period.start.getUTCFullYear(), period.start.getUTCMonth() + 3, 1);
      return quarterPeriod(nextStart.getUTCFullYear(), Math.floor(nextStart.getUTCMonth() / 3) + 1);
    }
    case "year":
      return yearPeriod(period.start.getUTCFullYear() + 1);
    default: {
      const durationMs = period.end.getTime() - period.start.getTime();
      return customPeriod(period.end, new Date(period.end.getTime() + durationMs));
    }
  }
}

/** `count` consecutive periods of the given granularity, ending with (and including) `anchor`. */
export function trailingPeriods(count: number, anchor: Period): Period[] {
  const list: Period[] = [anchor];
  let cur = anchor;
  for (let i = 1; i < count; i++) {
    cur = previousPeriod(cur);
    list.unshift(cur);
  }
  return list;
}
