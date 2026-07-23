import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatYen } from "@/lib/enums";
import {
  roi,
  cpa,
  budgetConsumptionRate,
  effectiveDailyBudget,
  sumReports,
  withWeeklyCreative,
  contentGmvTotal,
  normalizeAnchor,
  periodRange,
  periodLabel,
  previousPeriodWord,
  trendPct,
  buildInsights,
  shiftAnchor,
  ymdUtc,
  type Period,
  type DailyReportLike,
} from "@/lib/reports";
import { ReportPeriodPicker } from "@/components/ReportPeriodPicker";
import { PrintButton } from "@/components/PrintButton";
import { TrendBadge } from "@/components/TrendBadge";
import { StatTile } from "@/components/StatTile";
import { InsightList } from "@/components/InsightList";
import { CompositionBar } from "@/components/CompositionBar";
import { unitBrandLabel } from "@/lib/progress";
import { CH } from "@/lib/reportColors";

export const dynamic = "force-dynamic";

const nz = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("ja-JP"));
const pct = (n: number | null) => (n == null ? "—" : `${n}%`);

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function loadTotals(period: Period, start: Date, end: Date) {
  const units = await prisma.salesUnit.findMany({
    where: { status: "稼働中" },
    include: {
      dailyReports: { where: { reportDate: { gte: start, lt: end } } },
      weeks: { select: { weekStart: true, videoPosts: true, liveCount: true, videoGmv: true, liveGmv: true } },
      account: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = units.map((u) => {
    const r = withWeeklyCreative(sumReports(u.dailyReports), u.weeks, period, start, end);
    return { u, r, roi: roi(r), cpa: cpa(r), rate: budgetConsumptionRate(r, u.dailyAdBudget), contentGmv: contentGmvTotal(r) ?? 0 };
  });

  const totalAdSpend = rows.reduce((s, x) => s + (x.r.adSpend ?? 0), 0);
  const totalGmv = rows.reduce((s, x) => s + (x.r.adGmv ?? 0), 0);
  const totalVideoGmv = rows.reduce((s, x) => s + (x.r.videoGmv ?? 0), 0);
  const totalLiveGmv = rows.reduce((s, x) => s + (x.r.liveGmv ?? 0), 0);
  const totalOrders = rows.reduce((s, x) => s + (x.r.orderCount ?? 0), 0);
  const totalBudget = rows.reduce((s, x) => s + (effectiveDailyBudget(x.r, x.u.dailyAdBudget) ?? 0), 0);
  const totalVideoPosts = rows.reduce((s, x) => s + (x.r.videoPosts ?? 0), 0);
  const totalLiveCount = rows.reduce((s, x) => s + (x.r.liveCount ?? 0), 0);
  const totalShippingQty = rows.reduce((s, x) => s + (x.r.shippingQty ?? 0), 0);
  const totalShippingAmount = rows.reduce((s, x) => s + (x.r.shippingAmount ?? 0), 0);
  const totalRoi = totalAdSpend > 0 ? Math.round((totalGmv / totalAdSpend) * 1000) / 10 : null;
  const totalCpa = totalOrders > 0 ? Math.round(totalAdSpend / totalOrders) : null;
  const totalRate = totalBudget > 0 ? Math.round((totalAdSpend / totalBudget) * 1000) / 10 : null;

  const agg: DailyReportLike = {
    videoPosts: totalVideoPosts,
    liveCount: totalLiveCount,
    videoGmv: totalVideoGmv,
    liveGmv: totalLiveGmv,
    adSpend: totalAdSpend,
    adGmv: totalGmv,
    orderCount: totalOrders,
    shippingQty: totalShippingQty,
    shippingAmount: totalShippingAmount,
  };

  return {
    rows,
    agg,
    totalContentGmv: totalVideoGmv + totalLiveGmv,
    totalAdSpend,
    totalGmv,
    totalVideoGmv,
    totalLiveGmv,
    totalOrders,
    totalVideoPosts,
    totalLiveCount,
    totalShippingQty,
    totalShippingAmount,
    totalRoi,
    totalCpa,
    totalRate,
  };
}

export default async function DailyReportIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; period?: string }>;
}) {
  const { date, period: periodParam } = await searchParams;
  const period: Period = periodParam === "week" || periodParam === "month" ? periodParam : "day";
  const dateStr = date ?? todayStr();
  const anchor = normalizeAnchor(period, dateStr);
  const anchorStr = ymdUtc(anchor);
  const { start, end } = periodRange(period, anchor);
  const prevAnchor = shiftAnchor(period, anchor, -1);
  const { start: prevStart, end: prevEnd } = periodRange(period, prevAnchor);

  const [current, previous] = await Promise.all([
    loadTotals(period, start, end),
    loadTotals(period, prevStart, prevEnd),
  ]);
  const { rows } = current;

  const insights = buildInsights({
    period,
    current: current.agg,
    previous: previous.agg,
    roiCur: current.totalRoi,
    roiPrev: previous.totalRoi,
    cpaCur: current.totalCpa,
    cpaPrev: previous.totalCpa,
    budgetRate: current.totalRate,
  });

  const prevWord = previousPeriodWord(period);
  const summaryTitle = period === "day" ? "本日のサマリー" : period === "week" ? "今週のサマリー" : "今月のサマリー";

  // 販売単位別 コンテンツ売上ランキング（大きい順）
  const ranked = [...rows].sort((a, b) => b.contentGmv - a.contentGmv);
  const maxContentGmv = Math.max(1, ...ranked.map((x) => x.contentGmv));

  return (
    <div className="p-6 max-w-7xl">
      <div className="print:hidden mb-1">
        <Link href="/reports" className="text-sm text-emerald-600 hover:underline">
          ← レポート
        </Link>
      </div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">日次進捗報告</h1>
          <p className="text-sm text-slate-500">{periodLabel(period, anchor)} の実績（稼働中の販売単位 全体）</p>
        </div>
        <div className="flex items-center gap-2">
          <ReportPeriodPicker date={anchorStr} period={period} />
          <a
            href={`/reports/daily/csv?date=${anchorStr}&period=${period}`}
            className="print:hidden rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            CSV出力
          </a>
          <PrintButton />
        </div>
      </div>

      {/* ヒーロー: コンテンツ経由売上 ＋ チャネル構成 ＋ 広告サマリー */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
          <div className="text-xs text-emerald-700 font-medium">コンテンツ経由の売上 合計（動画＋ライブ）</div>
          <div className="mt-1 flex items-end gap-3">
            <span className="text-4xl font-bold text-emerald-700 tracking-tight">{formatYen(current.totalContentGmv)}</span>
            <span className="mb-1.5">
              <TrendBadge deltaPct={trendPct(current.totalContentGmv, previous.totalContentGmv)} suffix={`vs ${prevWord}`} />
            </span>
          </div>
          <div className="mt-4">
            <CompositionBar video={current.totalVideoGmv} live={current.totalLiveGmv} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs text-slate-500 font-medium mb-3">広告パフォーマンス 合計</div>
          <dl className="space-y-3">
            <MiniRow label="広告経由GMV" value={formatYen(current.totalGmv)} delta={trendPct(current.totalGmv, previous.totalGmv)} />
            <MiniRow label="ROI" value={pct(current.totalRoi)} delta={trendPct(current.totalRoi, previous.totalRoi)} />
            <MiniRow label="広告費" value={formatYen(current.totalAdSpend)} delta={trendPct(current.totalAdSpend, previous.totalAdSpend)} invert />
            <MiniRow label="日予算消化率" value={pct(current.totalRate)} delta={trendPct(current.totalRate, previous.totalRate)} invert />
          </dl>
        </div>
      </div>

      {/* サマリー（示唆） */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          {summaryTitle}
          <span className="ml-2 text-xs font-normal text-slate-400">（{prevWord}比較・数値から自動生成）</span>
        </h2>
        <InsightList items={insights} />
      </section>

      {/* KPIタイル */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile label="動画経由GMV" value={formatYen(current.totalVideoGmv)} deltaPct={trendPct(current.totalVideoGmv, previous.totalVideoGmv)} />
        <StatTile label="ライブ経由GMV" value={formatYen(current.totalLiveGmv)} deltaPct={trendPct(current.totalLiveGmv, previous.totalLiveGmv)} />
        <StatTile label="動画投稿数" value={nz(current.totalVideoPosts)} deltaPct={trendPct(current.totalVideoPosts, previous.totalVideoPosts)} />
        <StatTile label="ライブ実施回数" value={nz(current.totalLiveCount)} deltaPct={trendPct(current.totalLiveCount, previous.totalLiveCount)} />
        <StatTile label="注文数" value={nz(current.totalOrders)} deltaPct={trendPct(current.totalOrders, previous.totalOrders)} />
        <StatTile label="CPA" value={current.totalCpa == null ? "—" : formatYen(current.totalCpa)} deltaPct={trendPct(current.totalCpa, previous.totalCpa)} invert />
        <StatTile label="配送 売上個数" value={nz(current.totalShippingQty)} deltaPct={trendPct(current.totalShippingQty, previous.totalShippingQty)} />
        <StatTile label="配送 売上金額" value={formatYen(current.totalShippingAmount)} deltaPct={trendPct(current.totalShippingAmount, previous.totalShippingAmount)} />
      </div>

      {/* 販売単位別 コンテンツ売上ランキング */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">販売単位別 コンテンツ売上</h2>
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {ranked.length === 0 && <p className="py-6 text-center text-sm text-slate-400">稼働中の販売単位がありません。</p>}
          {ranked.map(({ u, contentGmv, r }) => {
            const w = Math.round((contentGmv / maxContentGmv) * 100);
            const video = r.videoGmv ?? 0;
            const videoW = contentGmv > 0 ? Math.round((video / contentGmv) * w) : 0;
            return (
              <Link
                key={u.id}
                href={`/reports/daily/${u.id}?date=${anchorStr}&period=${period}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="w-40 shrink-0 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{u.productSku ?? unitBrandLabel(u)}</div>
                  <div className="text-[11px] text-slate-400 truncate">{unitBrandLabel(u)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-5 w-full rounded bg-slate-100 overflow-hidden flex">
                    <div className="h-full" style={{ width: `${videoW}%`, backgroundColor: CH.video }} />
                    <div className="h-full" style={{ width: `${w - videoW}%`, backgroundColor: CH.live }} />
                  </div>
                </div>
                <div className="w-28 shrink-0 text-right">
                  <div className="text-sm font-semibold text-slate-800 tabular-nums">{formatYen(contentGmv)}</div>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-4 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CH.video }} />動画経由</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CH.live }} />ライブ経由</span>
        </div>
      </section>

      {/* 全指標テーブル（折りたたみ） */}
      <details className="mb-6">
        <summary className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          販売単位別の全指標テーブルを表示
        </summary>
        <div className="mt-2 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm bg-white">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="py-2 px-3 font-medium">販売単位</th>
                <th className="py-2 px-3 font-medium text-right">動画投稿</th>
                <th className="py-2 px-3 font-medium text-right">ライブ</th>
                <th className="py-2 px-3 font-medium text-right">動画GMV</th>
                <th className="py-2 px-3 font-medium text-right">ライブGMV</th>
                <th className="py-2 px-3 font-medium text-right">広告費</th>
                <th className="py-2 px-3 font-medium text-right">広告経由GMV</th>
                <th className="py-2 px-3 font-medium text-right">ROI</th>
                <th className="py-2 px-3 font-medium text-right">注文数</th>
                <th className="py-2 px-3 font-medium text-right">CPA</th>
                <th className="py-2 px-3 font-medium text-right">消化率</th>
                <th className="py-2 px-3 font-medium text-right">配送個数</th>
                <th className="py-2 px-3 font-medium text-right">配送金額</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ u, r, roi: rRoi, cpa: rCpa, rate }) => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3">
                    <Link href={`/reports/daily/${u.id}?date=${anchorStr}&period=${period}`} className="font-medium text-slate-800 hover:text-emerald-700 hover:underline">
                      {u.productSku ?? unitBrandLabel(u)}
                    </Link>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{nz(r.videoPosts)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{nz(r.liveCount)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.videoGmv == null ? "—" : formatYen(r.videoGmv)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.liveGmv == null ? "—" : formatYen(r.liveGmv)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.adSpend == null ? "—" : formatYen(r.adSpend)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.adGmv == null ? "—" : formatYen(r.adGmv)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{pct(rRoi)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{nz(r.orderCount)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{rCpa == null ? "—" : formatYen(rCpa)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{pct(rate)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{nz(r.shippingQty)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.shippingAmount == null ? "—" : formatYen(r.shippingAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="print:hidden text-[11px] text-slate-400">
        販売単位をクリックすると、推移グラフ・出力ができる詳細画面に移動します。実績の入力・修正は「案件進捗管理」から行えます。
      </p>
    </div>
  );
}

function MiniRow({ label, value, delta, invert }: { label: string; value: string; delta: number | null; invert?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-800 tabular-nums">{value}</span>
        <TrendBadge deltaPct={delta} invert={invert} />
      </dd>
    </div>
  );
}
