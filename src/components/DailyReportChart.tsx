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

export type DailyAdPoint = {
  day: string;
  広告費: number;
  売上GMV: number;
  ROI: number | null;
};

/** 広告費・GMV(棒) + ROI(折れ線, 右軸%) の日次推移 */
export function DailyAdChart({ data }: { data: DailyAdPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="yen" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="roi" orientation="right" tick={{ fontSize: 12 }} unit="%" />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="yen" dataKey="広告費" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="yen" dataKey="売上GMV" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Line
          yAxisId="roi"
          type="monotone"
          dataKey="ROI"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export type ChannelGmvPoint = {
  day: string;
  動画GMV: number;
  ライブGMV: number;
};

/** 動画GMV・ライブGMVの積み上げ棒グラフ（チャネル別売上の推移） */
export function ChannelGmvChart({ data }: { data: ChannelGmvPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="動画GMV" stackId="gmv" fill="#0ea5e9" />
        <Bar dataKey="ライブGMV" stackId="gmv" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export type CreativePoint = {
  day: string;
  動画投稿数: number;
  ライブ実施回数: number;
};

/** 動画投稿数・ライブ実施回数の日次推移 */
export function CreativeChart({ data }: { data: CreativePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="動画投稿数" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="ライブ実施回数" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
