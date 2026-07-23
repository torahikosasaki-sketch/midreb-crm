import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatYen } from "@/lib/enums";
import {
  roi,
  cpa,
  budgetConsumptionRate,
  sumReports,
  withWeeklyCreative,
  contentGmvTotal,
  normalizeAnchor,
  periodRange,
  periodLabel,
  previousPeriodWord,
  trendPct,
  buildInsights,
  recentBuckets,
  shiftAnchor,
  ymdUtc,
  type Period,
} from "@/lib/reports";
import { PrintButton } from "@/components/PrintButton";
import { ReportPeriodPicker } from "@/components/ReportPeriodPicker";
import { TrendBadge } from "@/components/TrendBadge";
import { StatTile } from "@/components/StatTile";
import { InsightList } from "@/components/InsightList";
import { CompositionBar } from "@/components/CompositionBar";
import { Sparkline } from "@/components/Sparkline";
import {
  AdCompareChart,
  RoiTrendChart,
  CreativeChart,
  ChannelGmvChart,
  type DailyAdPoint,
  type RoiPoint,
  type CreativePoint,
  type ChannelGmvPoint,
} from "@/components/DailyReportChart";
import { CH } from "@/lib/reportColors";
import { unitBrandLabel } from "@/lib/progress";

export const dynamic = "force-dynamic";

const nz = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("ja-JP"));
const pct = (n: number | null) => (n == null ? "—" : `${n}%`);

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const BUCKET_COUNT: Record<Period, number> = { day: 30, week: 12, month: 12 };
const periodUnit = (p: Period) => (p === "day" ? "日" : p === "week" ? "週" : "ヶ月");

export default async function DailyReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string; period?: string }>;
}) {
  const { id } = await params;
  const { date, period: periodParam } = await searchParams;
  const period: Period = periodParam === "week" || periodParam === "month" ? periodParam : "day";
  const dateStr = date ?? todayStr();
  const anchor = normalizeAnchor(period, dateStr);
  const anchorStr = ymdUtc(anchor);

  const unit = await prisma.salesUnit.findUnique({
    where: { id },
    include: {
      dailyReports: { orderBy: { reportDate: "asc" } },
      weeks: { select: { weekStart: true, videoPosts: true, liveCount: true, videoGmv: true, liveGmv: true } },
      account: { select: { name: true } },
    },
  });
  if (!unit) notFound();

  const reports = unit.dailyReports;
  const { start, end } = periodRange(period, anchor);
  const selectedRows = reports.filter((r) => r.reportDate >= start && r.reportDate < end);
  const selected = withWeeklyCreative(sumReports(selectedRows), unit.weeks, period, start, end);

  const selRoi = roi(selected);
  const selCpa = cpa(selected);
  const selRate = budgetConsumptionRate(selected, unit.dailyAdBudget);
  const selContentGmv = contentGmvTotal(selected);

  // 前期間（比較用）
  const prevAnchor = shiftAnchor(period, anchor, -1);
  const { start: prevStart, end: prevEnd } = periodRange(period, prevAnchor);
  const prevRows = reports.filter((r) => r.reportDate >= prevStart && r.reportDate < prevEnd);
  const previous = withWeeklyCreative(sumReports(prevRows), unit.weeks, period, prevStart, prevEnd);
  const prevRoi = roi(previous);
  const prevCpa = cpa(previous);
  const prevContentGmv = contentGmvTotal(previous);

  const insights = buildInsights({
    period,
    current: selected,
    previous,
    roiCur: selRoi,
    roiPrev: prevRoi,
    cpaCur: selCpa,
    cpaPrev: prevCpa,
    budgetRate: selRate,
  });
  const prevWord = previousPeriodWord(period);
  const summaryTitle = period === "day" ? "本日のサマリー" : period === "week" ? "今週のサマリー" : "今月のサマリー";

  // 直近N期間分の推移
  const buckets = recentBuckets(reports, period, BUCKET_COUNT[period], anchor, unit.weeks);
  const adChartData: DailyAdPoint[] = buckets.map((b) => ({
    day: b.label,
    広告費: b.data.adSpend ?? 0,
    売上GMV: b.data.adGmv ?? 0,
  }));
  const roiChartData: RoiPoint[] = buckets.map((b) => ({ day: b.label, ROI: roi(b.data) }));
  const creativeChartData: CreativePoint[] = buckets.map((b) => ({
    day: b.label,
    動画投稿数: b.data.videoPosts ?? 0,
    ライブ実施回数: b.data.liveCount ?? 0,
  }));
  const channelGmvChartData: ChannelGmvPoint[] = buckets.map((b) => ({
    day: b.label,
    動画GMV: b.data.videoGmv ?? 0,
    ライブGMV: b.data.liveGmv ?? 0,
  }));
  const hasChannelGmv = buckets.some((b) => b.data.videoGmv != null || b.data.liveGmv != null);
  const hasAdData = reports.some((r) => r.adSpend != null || r.adGmv != null);

  // スパークライン用の系列
  const contentGmvSpark = buckets.map((b) => (b.data.videoGmv ?? 0) + (b.data.liveGmv ?? 0));
  const orderSpark = buckets.map((b) => b.data.orderCount ?? 0);

  return (
    <div className="p-6 max-w-6xl">
      <div className="print:hidden mb-1">
        <Link href={`/reports/daily?date=${anchorStr}&period=${period}`} className="text-sm text-emerald-600 hover:underline">
          ← 日次進捗報告
        </Link>
      </div>

      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">{unit.productSku ?? unitBrandLabel(unit)}</h1>
          <p className="text-sm text-slate-500">
            {unitBrandLabel(unit)}
            {unit.store ? ` ・ ${unit.store}` : ""} ・ {periodLabel(period, anchor)}
          </p>
        </div>
        <div className="print:hidden flex items-center gap-2">
          <ReportPeriodPicker date={anchorStr} period={period} />
          <a
            href={`/reports/daily/${id}/csv?date=${anchorStr}&period=${period}`}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            CSV出力
          </a>
          <PrintButton />
        </div>
      </div>

      {/* ヒーロー: コンテンツ経由売上 ＋ チャネル構成 ＋ 広告サマリー */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-emerald-700 font-medium">コンテンツ経由の売上（動画＋ライブ）</div>
              <div className="mt-1 flex items-end gap-3">
                <span className="text-4xl font-bold text-emerald-700 tracking-tight">
                  {selContentGmv == null ? "—" : formatYen(selContentGmv)}
                </span>
                <span className="mb-1.5">
                  <TrendBadge deltaPct={trendPct(selContentGmv, prevContentGmv)} suffix={`vs ${prevWord}`} />
                </span>
              </div>
            </div>
            {contentGmvSpark.some((v) => v > 0) && (
              <Sparkline values={contentGmvSpark} color={CH.gmv} width={140} height={40} />
            )}
          </div>
          <div className="mt-4">
            <CompositionBar video={selected.videoGmv ?? 0} live={selected.liveGmv ?? 0} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-xs text-slate-500 font-medium mb-3">広告パフォーマンス</div>
          <dl className="space-y-3">
            <MiniRow label="広告経由GMV" value={selected.adGmv == null ? "—" : formatYen(selected.adGmv)} delta={trendPct(selected.adGmv, previous.adGmv)} />
            <MiniRow label="ROI" value={pct(selRoi)} delta={trendPct(selRoi, prevRoi)} />
            <MiniRow label="広告費" value={selected.adSpend == null ? "—" : formatYen(selected.adSpend)} delta={trendPct(selected.adSpend, previous.adSpend)} invert />
            <MiniRow label="日予算消化率" value={pct(selRate)} delta={trendPct(selRate, budgetConsumptionRate(previous, unit.dailyAdBudget))} invert />
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <StatTile label="動画経由GMV" value={selected.videoGmv == null ? "—" : formatYen(selected.videoGmv)} deltaPct={trendPct(selected.videoGmv, previous.videoGmv)} />
        <StatTile label="ライブ経由GMV" value={selected.liveGmv == null ? "—" : formatYen(selected.liveGmv)} deltaPct={trendPct(selected.liveGmv, previous.liveGmv)} />
        <StatTile label="動画投稿数" value={nz(selected.videoPosts)} deltaPct={trendPct(selected.videoPosts, previous.videoPosts)} />
        <StatTile label="ライブ実施回数" value={nz(selected.liveCount)} deltaPct={trendPct(selected.liveCount, previous.liveCount)} />
        <StatTile label="注文数" value={nz(selected.orderCount)} deltaPct={trendPct(selected.orderCount, previous.orderCount)} spark={orderSpark} />
        <StatTile label="CPA" value={selCpa == null ? "—" : formatYen(selCpa)} deltaPct={trendPct(selCpa, prevCpa)} invert />
        <StatTile label="配送 売上個数" value={nz(selected.shippingQty)} deltaPct={trendPct(selected.shippingQty, previous.shippingQty)} />
        <StatTile label="配送 売上金額" value={selected.shippingAmount == null ? "—" : formatYen(selected.shippingAmount)} deltaPct={trendPct(selected.shippingAmount, previous.shippingAmount)} />
      </div>

      {selectedRows.length === 0 && (selected.videoPosts != null || selected.liveCount != null) && (
        <p className="print:hidden text-xs text-slate-400 mb-6">
          ※ 動画投稿数・ライブ実施回数・チャネル別GMVは案件進捗管理の週次実績から自動反映。広告・配送の実績は
          <Link href={`/progress/${id}`} className="text-emerald-600 hover:underline">案件進捗管理</Link>
          から入力してください。
        </p>
      )}
      {selectedRows.length === 0 && selected.videoPosts == null && selected.liveCount == null && (
        <p className="print:hidden text-sm text-slate-400 mb-6">
          {periodLabel(period, anchor)} の記録はまだありません。
          <Link href={`/progress/${id}`} className="text-emerald-600 hover:underline">案件進捗管理</Link>
          から入力してください。
        </p>
      )}

      {/* 推移グラフ */}
      <div className="print:hidden grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <ChartCard title={`チャネル別売上（動画/ライブ）推移 ・ 直近${BUCKET_COUNT[period]}${periodUnit(period)}`}>
          {hasChannelGmv ? <ChannelGmvChart data={channelGmvChartData} /> : <Empty note="動画/ライブGMVは案件進捗管理の週次実績から反映されます" />}
        </ChartCard>
        <ChartCard title={`クリエイティブ活動 推移 ・ 直近${BUCKET_COUNT[period]}${periodUnit(period)}`}>
          {reports.length === 0 && unit.weeks.length === 0 ? <Empty /> : <CreativeChart data={creativeChartData} />}
        </ChartCard>
        <ChartCard title={`広告費 と 広告経由GMV ・ 直近${BUCKET_COUNT[period]}${periodUnit(period)}`}>
          {hasAdData ? <AdCompareChart data={adChartData} /> : <Empty note="広告実績は案件進捗管理から入力してください" />}
        </ChartCard>
        <ChartCard title={`ROI 推移 ・ 直近${BUCKET_COUNT[period]}${periodUnit(period)}`}>
          {hasAdData ? <RoiTrendChart data={roiChartData} /> : <Empty note="広告実績は案件進捗管理から入力してください" />}
        </ChartCard>
      </div>

      {/* 生データ（折りたたみ・読み取り専用） */}
      <details className="print:hidden mb-8">
        <summary className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
          日次の生データ（{reports.length}件）を表示
        </summary>
        <div className="mt-2 flex justify-end">
          <Link href={`/progress/${id}`} className="text-xs text-emerald-600 hover:underline">
            実績を入力 → 案件進捗管理
          </Link>
        </div>
        <div className="mt-2 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm bg-white">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="py-2 px-3 font-medium">日付</th>
                <th className="py-2 px-3 font-medium text-right">動画投稿</th>
                <th className="py-2 px-3 font-medium text-right">ライブ</th>
                <th className="py-2 px-3 font-medium text-right">広告費</th>
                <th className="py-2 px-3 font-medium text-right">GMV</th>
                <th className="py-2 px-3 font-medium text-right">ROI</th>
                <th className="py-2 px-3 font-medium text-right">注文数</th>
                <th className="py-2 px-3 font-medium text-right">CPA</th>
                <th className="py-2 px-3 font-medium text-right">消化率</th>
                <th className="py-2 px-3 font-medium text-right">配送個数</th>
                <th className="py-2 px-3 font-medium text-right">配送金額</th>
                <th className="py-2 px-3 font-medium">メモ</th>
              </tr>
            </thead>
            <tbody>
              {[...reports].reverse().map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 px-3 font-medium">{ymdUtc(r.reportDate)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{nz(r.videoPosts)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{nz(r.liveCount)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.adSpend == null ? "—" : formatYen(r.adSpend)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.adGmv == null ? "—" : formatYen(r.adGmv)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{pct(roi(r))}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{nz(r.orderCount)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{cpa(r) == null ? "—" : formatYen(cpa(r)!)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{pct(budgetConsumptionRate(r, unit.dailyAdBudget))}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{nz(r.shippingQty)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.shippingAmount == null ? "—" : formatYen(r.shippingAmount)}</td>
                  <td className="py-2 px-3 text-slate-600 text-xs max-w-40 truncate">{r.memo ?? "—"}</td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-6 text-center text-slate-400">記録がありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </details>
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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-700 mb-2">{title}</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-4">{children}</div>
    </section>
  );
}

function Empty({ note }: { note?: string }) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm text-slate-400">記録がありません</p>
      {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
    </div>
  );
}
