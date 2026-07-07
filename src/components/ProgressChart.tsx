"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export type ProgressPoint = {
  week: string;
  動画販売: number;
  ライブ販売: number;
  目標: number | null;
};

export function ProgressChart({ data }: { data: ProgressPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="動画販売" stackId="s" fill="#10b981" radius={[0, 0, 0, 0]} />
        <Bar dataKey="ライブ販売" stackId="s" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        <Line
          type="monotone"
          dataKey="目標"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
