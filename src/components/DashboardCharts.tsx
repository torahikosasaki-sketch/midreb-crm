"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatYen } from "@/lib/enums";

const yen = (v: number) => formatYen(Number(v) || 0);
const man = (v: number) => (v >= 10000 ? `${Math.round(v / 10000)}万` : String(v));

const PHASE_HEX: Record<string, string> = {
  初回接触: "#94a3b8",
  提案: "#0ea5e9",
  条件調整: "#f59e0b",
  契約: "#8b5cf6",
  オンボーディング: "#10b981",
  運用中: "#16a34a",
};

const BIZ_HEX = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#94a3b8"];

/** フェーズ別の加重売上（ファネル） */
export function PhaseFunnel({
  data,
}: {
  data: { phase: string; count: number; weighted: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={man} />
        <YAxis type="category" dataKey="phase" tick={{ fontSize: 12 }} width={84} />
        <Tooltip
          formatter={(v, _n, item) => [
            `${yen(Number(v))}（${(item as { payload?: { count?: number } })?.payload?.count ?? 0}件）`,
            "加重売上",
          ]}
        />
        <Bar dataKey="weighted" radius={[0, 4, 4, 0]}>
          {data.map((d) => (
            <Cell key={d.phase} fill={PHASE_HEX[d.phase] ?? "#94a3b8"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** 事業区分別 加重売上 構成比 */
export function BizPie({ data }: { data: { name: string; value: number }[] }) {
  const shown = data.filter((d) => d.value > 0);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={shown}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={48}
          paddingAngle={2}
        >
          {shown.map((d, i) => (
            <Cell key={d.name} fill={BIZ_HEX[i % BIZ_HEX.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => yen(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** 月次見込み（受注予定日別の加重売上） */
export function MonthlyBars({ data }: { data: { month: string; weighted: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={man} />
        <Tooltip formatter={(v) => [yen(Number(v)), "加重売上"]} />
        <Bar dataKey="weighted" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** 担当者別 加重売上 */
export function OwnerBars({ data }: { data: { owner: string; weighted: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 24, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={man} />
        <YAxis type="category" dataKey="owner" tick={{ fontSize: 12 }} width={72} />
        <Tooltip formatter={(v) => [yen(Number(v)), "加重売上"]} />
        <Bar dataKey="weighted" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
