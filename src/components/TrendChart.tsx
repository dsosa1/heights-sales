"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency } from "@/lib/format";
import type { TrendPoint } from "@/lib/analytics/queries";

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-72 w-full rounded-xl border border-black/10 p-4 dark:border-white/10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-black/10 dark:stroke-white/10" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(Number(v))} width={80} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
