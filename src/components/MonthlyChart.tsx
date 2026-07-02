"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { BUSINESS_TYPES, formatYen } from "@/lib/enums";

const COLORS: Record<string, string> = {
  storeb: "#0ea5e9",
  国内TSP導入: "#8b5cf6",
  海外進出: "#10b981",
  "他社動画・ライブ支援": "#f59e0b",
  コンサル: "#f43f5e",
};

export type MonthRow = { month: string } & Record<string, number | string>;

export function MonthlyChart({ data }: { data: MonthRow[] }) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => (v >= 10000 ? `${Math.round(v / 10000)}万` : String(v))}
        />
        <Tooltip
          formatter={(value, name) => [formatYen(Number(value) || 0), String(name)]}
          labelFormatter={(l) => `${l} の加重売上`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {BUSINESS_TYPES.map((b) => (
          <Bar key={b} dataKey={b} stackId="a" fill={COLORS[b] ?? "#94a3b8"} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
