"use client";

import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { CH, GRID, AXIS_TICK, SURFACE } from "@/lib/reportColors";

const yen = (n: number) => "¥" + Math.round(n).toLocaleString("ja-JP");
/** Y軸用の万単位コンパクト表記 */
const yenAxis = (v: number) => {
  if (v === 0) return "0";
  if (Math.abs(v) >= 10000) {
    const m = v / 10000;
    return `${Number.isInteger(m) ? m : m.toFixed(1)}万`;
  }
  return `${v}`;
};
// Recharts の Tooltip formatter 用（value は ValueType|undefined で渡る）
const yenTooltip = (v: unknown) => (typeof v === "number" ? yen(v) : String(v ?? ""));
const pctTooltip = (v: unknown) => (typeof v === "number" ? `${v}%` : String(v ?? ""));

const axisTick = { fontSize: 11, fill: AXIS_TICK };
const tooltipStyle = {
  contentStyle: { fontSize: 12, borderRadius: 8, border: `1px solid ${GRID}` },
  labelStyle: { color: "#475569", fontWeight: 600 },
};

// ── 広告費 vs 広告経由GMV（グルーピング棒・単一Y軸） ─────────────
export type DailyAdPoint = {
  day: string;
  広告費: number;
  売上GMV: number;
};

export function AdCompareChart({ data }: { data: DailyAdPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={yenAxis} width={44} />
        <Tooltip {...tooltipStyle} formatter={yenTooltip} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar isAnimationActive={false} dataKey="広告費" fill={CH.adSpend} radius={[3, 3, 0, 0]} maxBarSize={22} />
        <Bar isAnimationActive={false} dataKey="売上GMV" fill={CH.gmv} radius={[3, 3, 0, 0]} maxBarSize={22} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── ROI 推移（単一系列の折れ線＋エリア。%軸） ───────────────────
export type RoiPoint = { day: string; ROI: number | null };

export function RoiTrendChart({ data }: { data: RoiPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} unit="%" width={44} />
        <Tooltip {...tooltipStyle} formatter={pctTooltip} />
        <Area isAnimationActive={false} type="monotone" dataKey="ROI" stroke="none" fill={CH.roi} fillOpacity={0.1} connectNulls />
        <Line isAnimationActive={false} type="monotone" dataKey="ROI" stroke={CH.roi} strokeWidth={2} dot={{ r: 2.5, fill: CH.roi }} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── チャネル別売上（動画GMV / ライブGMV の積み上げ棒） ────────────
export type ChannelGmvPoint = {
  day: string;
  動画GMV: number;
  ライブGMV: number;
};

export function ChannelGmvChart({ data }: { data: ChannelGmvPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={yenAxis} width={44} />
        <Tooltip {...tooltipStyle} formatter={yenTooltip} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {/* stroke=サーフェス色で 2px のセグメント間ギャップを作る */}
        <Bar isAnimationActive={false} dataKey="動画GMV" stackId="gmv" fill={CH.video} stroke={SURFACE} strokeWidth={2} maxBarSize={26} />
        <Bar isAnimationActive={false} dataKey="ライブGMV" stackId="gmv" fill={CH.live} stroke={SURFACE} strokeWidth={2} radius={[3, 3, 0, 0]} maxBarSize={26} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── クリエイティブ活動（動画投稿数 / ライブ実施回数） ─────────────
export type CreativePoint = {
  day: string;
  動画投稿数: number;
  ライブ実施回数: number;
};

export function CreativeChart({ data }: { data: CreativePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar isAnimationActive={false} dataKey="動画投稿数" fill={CH.video} radius={[3, 3, 0, 0]} maxBarSize={22} />
        <Bar isAnimationActive={false} dataKey="ライブ実施回数" fill={CH.live} radius={[3, 3, 0, 0]} maxBarSize={22} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── ① 週次: 売上高・広告費（¥）＋ ROI（%）。単位が違うので2段パネルでx軸を共有（デュアル軸なし） ──
export type WeeklyAdRoiPoint = { week: string; 売上高: number; 広告費: number; ROI: number | null };

export function WeeklyAdRoiChart({ data }: { data: WeeklyAdRoiPoint[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={150}>
        <ComposedChart data={data} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="week" hide />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={yenAxis} width={48} />
          <Tooltip {...tooltipStyle} formatter={yenTooltip} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar isAnimationActive={false} dataKey="売上高" fill={CH.gmv} radius={[3, 3, 0, 0]} maxBarSize={22} />
          <Bar isAnimationActive={false} dataKey="広告費" fill={CH.adSpend} radius={[3, 3, 0, 0]} maxBarSize={22} />
        </ComposedChart>
      </ResponsiveContainer>
      <ResponsiveContainer width="100%" height={110}>
        <ComposedChart data={data} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="week" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} unit="%" width={48} />
          <Tooltip {...tooltipStyle} formatter={pctTooltip} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area isAnimationActive={false} type="monotone" dataKey="ROI" stroke="none" fill={CH.roi} fillOpacity={0.1} connectNulls />
          <Line isAnimationActive={false} type="monotone" dataKey="ROI" name="ROI（%）" stroke={CH.roi} strokeWidth={2} dot={{ r: 2.5, fill: CH.roi }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── ② 週次: 動画/ライブ 経由売上（¥）＋ 投稿数/実施数（回）。2段パネルでx軸を共有 ──
// 色はエンティティ固定（動画=青 / ライブ=菫）を上下段で一貫させる。
export type WeeklyChannelActivityPoint = {
  week: string;
  動画経由売上: number;
  ライブ経由売上: number;
  動画投稿数: number;
  LIVE実施数: number;
};

export function WeeklyChannelActivityChart({ data }: { data: WeeklyChannelActivityPoint[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={150}>
        <ComposedChart data={data} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="week" hide />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} tickFormatter={yenAxis} width={48} />
          <Tooltip {...tooltipStyle} formatter={yenTooltip} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar isAnimationActive={false} dataKey="動画経由売上" fill={CH.video} radius={[3, 3, 0, 0]} maxBarSize={20} />
          <Bar isAnimationActive={false} dataKey="ライブ経由売上" fill={CH.live} radius={[3, 3, 0, 0]} maxBarSize={20} />
        </ComposedChart>
      </ResponsiveContainer>
      <ResponsiveContainer width="100%" height={118}>
        <ComposedChart data={data} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
          <XAxis dataKey="week" tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={48} />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar isAnimationActive={false} dataKey="動画投稿数" fill={CH.video} radius={[3, 3, 0, 0]} maxBarSize={20} />
          <Bar isAnimationActive={false} dataKey="LIVE実施数" fill={CH.live} radius={[3, 3, 0, 0]} maxBarSize={20} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
