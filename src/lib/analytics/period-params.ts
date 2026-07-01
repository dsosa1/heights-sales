import { currentPeriod, monthPeriod, quarterPeriod, yearPeriod, type Granularity, type Period } from "./periods";

export interface PeriodSearchParams {
  granularity?: string;
  year?: string;
  month?: string;
  quarter?: string;
}

const GRANULARITIES: Granularity[] = ["month", "quarter", "year"];

export function resolvePeriod(params: PeriodSearchParams): Period {
  const granularity = GRANULARITIES.includes(params.granularity as Granularity)
    ? (params.granularity as Exclude<Granularity, "custom">)
    : "month";
  const now = new Date();

  if (granularity === "year") {
    const year = params.year ? Number(params.year) : now.getUTCFullYear();
    return yearPeriod(year);
  }
  if (granularity === "quarter") {
    const year = params.year ? Number(params.year) : now.getUTCFullYear();
    const quarter = params.quarter ? Number(params.quarter) : Math.floor(now.getUTCMonth() / 3) + 1;
    return quarterPeriod(year, quarter);
  }
  const year = params.year ? Number(params.year) : now.getUTCFullYear();
  const month = params.month ? Number(params.month) : now.getUTCMonth() + 1;
  return monthPeriod(year, month);
}

/** Query string that reproduces this period's start date under a given granularity (defaults to the period's own). */
export function periodToQuery(period: Period, granularity: Exclude<Granularity, "custom"> = period.granularity as Exclude<Granularity, "custom">): Record<string, string> {
  const year = String(period.start.getUTCFullYear());
  if (granularity === "year") return { granularity: "year", year };
  if (granularity === "quarter") {
    return { granularity: "quarter", year, quarter: String(Math.floor(period.start.getUTCMonth() / 3) + 1) };
  }
  return { granularity: "month", year, month: String(period.start.getUTCMonth() + 1) };
}

export function defaultPeriod(): Period {
  return currentPeriod("month");
}
