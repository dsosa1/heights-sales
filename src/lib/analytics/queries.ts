import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, lineItems, orderReps, orders, products, reps } from "@/db/schema";
import { previousPeriod, yearAgoPeriod, type Period } from "./periods";

function countedStatuses(): string[] {
  return (process.env.LEAFLINK_COUNTED_STATUSES ?? "Submitted,Accepted,Fulfilled,Completed")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function periodWhere(period: Period) {
  return and(gte(orders.orderDate, period.start), lt(orders.orderDate, period.end), inArray(orders.status, countedStatuses()));
}

export interface OverallTotals {
  revenue: number;
  orderCount: number;
  customerCount: number;
  avgOrderValue: number;
}

const emptyTotals: OverallTotals = { revenue: 0, orderCount: 0, customerCount: 0, avgOrderValue: 0 };

export async function getOverallTotals(period: Period): Promise<OverallTotals> {
  const [row] = await db
    .select({
      revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
      orderCount: sql<string>`count(distinct ${orders.id})`,
      customerCount: sql<string>`count(distinct ${orders.customerId})`,
    })
    .from(orders)
    .where(periodWhere(period));

  if (!row) return emptyTotals;
  const revenue = Number(row.revenue);
  const orderCount = Number(row.orderCount);
  const customerCount = Number(row.customerCount);
  return { revenue, orderCount, customerCount, avgOrderValue: orderCount ? revenue / orderCount : 0 };
}

function pctChange(current: number, base: number): number | null {
  if (base <= 0) return null;
  return ((current - base) / base) * 100;
}

export interface PeriodComparison {
  period: Period;
  previous: Period;
  yearAgo: Period;
  current: OverallTotals;
  previousTotals: OverallTotals;
  yearAgoTotals: OverallTotals;
  vsPreviousPct: number | null;
  vsYearAgoPct: number | null;
}

export async function getOverallComparison(period: Period): Promise<PeriodComparison> {
  const previous = previousPeriod(period);
  const yearAgo = yearAgoPeriod(period);
  const [current, previousTotals, yearAgoTotals] = await Promise.all([
    getOverallTotals(period),
    getOverallTotals(previous),
    getOverallTotals(yearAgo),
  ]);
  return {
    period,
    previous,
    yearAgo,
    current,
    previousTotals,
    yearAgoTotals,
    vsPreviousPct: pctChange(current.revenue, previousTotals.revenue),
    vsYearAgoPct: pctChange(current.revenue, yearAgoTotals.revenue),
  };
}

export interface TrendPoint {
  label: string;
  start: string;
  revenue: number;
  orderCount: number;
}

export async function getTrend(periods: Period[]): Promise<TrendPoint[]> {
  const totals = await Promise.all(periods.map((p) => getOverallTotals(p)));
  return periods.map((p, i) => ({
    label: p.label,
    start: p.start.toISOString(),
    revenue: totals[i].revenue,
    orderCount: totals[i].orderCount,
  }));
}

export interface BreakdownRow {
  id: number | null;
  name: string;
  secondary: string | null;
  revenue: number;
  quantity: number | null;
  orderCount: number;
  previousRevenue: number;
  changePct: number | null;
}

async function withComparison(
  agg: (period: Period) => Promise<Omit<BreakdownRow, "previousRevenue" | "changePct">[]>,
  period: Period,
  limit: number,
): Promise<BreakdownRow[]> {
  const previous = previousPeriod(period);
  const [currentRows, previousRows] = await Promise.all([agg(period), agg(previous)]);
  const previousById = new Map(previousRows.map((r) => [r.id, r.revenue]));
  return currentRows
    .map((r) => {
      const previousRevenue = previousById.get(r.id) ?? 0;
      return { ...r, previousRevenue, changePct: pctChange(r.revenue, previousRevenue) };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function getSkuBreakdown(period: Period, limit = 200): Promise<BreakdownRow[]> {
  return withComparison(async (p) => {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        revenue: sql<string>`coalesce(sum(${lineItems.lineTotal}), 0)`,
        quantity: sql<string>`coalesce(sum(${lineItems.quantity}), 0)`,
        orderCount: sql<string>`count(distinct ${lineItems.orderId})`,
      })
      .from(lineItems)
      .innerJoin(orders, eq(lineItems.orderId, orders.id))
      .leftJoin(products, eq(lineItems.productId, products.id))
      .where(periodWhere(p))
      .groupBy(products.id, products.name, products.sku);

    return rows.map((r) => ({
      id: r.id,
      name: r.name ?? "Unknown product",
      secondary: r.sku,
      revenue: Number(r.revenue),
      quantity: Number(r.quantity),
      orderCount: Number(r.orderCount),
    }));
  }, period, limit);
}

export function getCustomerBreakdown(period: Period, limit = 200): Promise<BreakdownRow[]> {
  return withComparison(async (p) => {
    const rows = await db
      .select({
        id: customers.id,
        name: customers.name,
        city: customers.city,
        state: customers.state,
        revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
        orderCount: sql<string>`count(distinct ${orders.id})`,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(periodWhere(p))
      .groupBy(customers.id, customers.name, customers.city, customers.state);

    return rows.map((r) => ({
      id: r.id,
      name: r.name ?? "Unknown customer",
      secondary: [r.city, r.state].filter(Boolean).join(", ") || null,
      revenue: Number(r.revenue),
      quantity: null,
      orderCount: Number(r.orderCount),
    }));
  }, period, limit);
}

export function getRepBreakdown(period: Period, limit = 200): Promise<BreakdownRow[]> {
  return withComparison(async (p) => {
    const rows = await db
      .select({
        id: reps.id,
        name: reps.name,
        email: reps.email,
        revenue: sql<string>`coalesce(sum(${orders.total}), 0)`,
        orderCount: sql<string>`count(distinct ${orders.id})`,
      })
      .from(orderReps)
      .innerJoin(orders, eq(orderReps.orderId, orders.id))
      .leftJoin(reps, eq(orderReps.repId, reps.id))
      .where(periodWhere(p))
      .groupBy(reps.id, reps.name, reps.email);

    return rows.map((r) => ({
      id: r.id,
      name: r.name ?? "Unknown rep",
      secondary: r.email,
      revenue: Number(r.revenue),
      quantity: null,
      orderCount: Number(r.orderCount),
    }));
  }, period, limit);
}
