import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatYen } from "@/lib/enums";
import {
  roi,
  cpa,
  budgetConsumptionRate,
  sumReports,
  normalizeAnchor,
  periodRange,
  periodLabel,
  recentBuckets,
  ymdUtc,
  type Period,
} from "@/lib/reports";
import { PrintButton } from "@/components/PrintButton";
import { ReportPeriodPicker } from "@/components/ReportPeriodPicker";
import { DailyAdChart, CreativeChart, type DailyAdPoint, type CreativePoint } from "@/components/DailyReportChart";
import { unitBrandLabel } from "@/lib/progress";

export const dynamic = "force-dynamic";

const nz = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("ja-JP"));
const pct = (n: number | null) => (n == null ? "—" : `${n}%`);

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const BUCKET_COUNT: Record<Period, number> = { day: 30, week: 12, month: 12 };

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
    include: { dailyReports: { orderBy: { reportDate: "asc" } }, account: { select: { name: true } } },
  });
  if (!unit) notFound();

  const reports = unit.dailyReports;
  const { start, end } = periodRange(period, anchor);
  const selectedRows = reports.filter((r) => r.reportDate >= start && r.reportDate < end);
  const selected = sumReports(selectedRows);

  const selRoi = roi(selected);
  const selCpa = cpa(selected);
  const selRate = budgetConsumptionRate(selected, unit.dailyAdBudget);

  // 直近N期間分の推移
  const buckets = recentBuckets(reports, period, BUCKET_COUNT[period], anchor);
  const adChartData: DailyAdPoint[] = buckets.map((b) => ({
    day: b.label,
    広告費: b.data.adSpend ?? 0,
    売上GMV: b.data.adGmv ?? 0,
    ROI: roi(b.data),
  }));
  const creativeChartData: CreativePoint[] = buckets.map((b) => ({
    day: b.label,
    動画投稿数: b.data.videoPosts ?? 0,
    ライブ実施回数: b.data.liveCount ?? 0,
  }));

  return (
    <div className="p-6 max-w-6xl">
      <div className="print:hidden mb-1">
        <Link href={`/reports/daily?date=${anchorStr}&period=${period}`} className="text-sm text-emerald-600 hover:underline">
          ← 日次進捗報告
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">{unit.productSku ?? unitBrandLabel(unit)}</h1>
          <p className="text-sm text-slate-500">
            {unitBrandLabel(unit)}
            {unit.store ? ` ・ ${unit.store}` : ""} ・ {periodLabel(period, anchor)} の進捗報告
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

      {/* 選択期間のKPI（印刷対象） */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Kpi label="動画投稿数" value={nz(selected.videoPosts)} />
        <Kpi label="ライブ実施回数" value={nz(selected.liveCount)} />
        <Kpi label="広告費" value={selected.adSpend == null ? "—" : formatYen(selected.adSpend)} />
        <Kpi label="売上(GMV)" value={selected.adGmv == null ? "—" : formatYen(selected.adGmv)} accent />
        <Kpi label="ROI" value={pct(selRoi)} />
        <Kpi label="注文数" value={nz(selected.orderCount)} />
        <Kpi label="CPA" value={selCpa == null ? "—" : formatYen(selCpa)} />
        <Kpi label="日予算消化率" value={pct(selRate)} />
        <Kpi label="配送 売上個数" value={nz(selected.shippingQty)} />
        <Kpi label="配送 売上金額" value={selected.shippingAmount == null ? "—" : formatYen(selected.shippingAmount)} />
      </div>
      {selectedRows.length === 0 && (
        <p className="print:hidden text-sm text-slate-400 -mt-6 mb-8">
          {periodLabel(period, anchor)} の記録はまだありません。
          <Link href={`/progress/${id}`} className="text-emerald-600 hover:underline">
            案件進捗管理
          </Link>
          から入力してください。
        </p>
      )}

      {/* 推移グラフ */}
      <div className="print:hidden grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            広告費・GMV・ROI 推移（直近{BUCKET_COUNT[period]}{period === "day" ? "日" : period === "week" ? "週" : "ヶ月"}）
          </h2>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            {reports.length === 0 ? (
              <p className="text-sm text-slate-400 py-10 text-center">記録がありません</p>
            ) : (
              <DailyAdChart data={adChartData} />
            )}
          </div>
        </section>
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            クリエイティブ推移（直近{BUCKET_COUNT[period]}{period === "day" ? "日" : period === "week" ? "週" : "ヶ月"}）
          </h2>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            {reports.length === 0 ? (
              <p className="text-sm text-slate-400 py-10 text-center">記録がありません</p>
            ) : (
              <CreativeChart data={creativeChartData} />
            )}
          </div>
        </section>
      </div>

      {/* 実績テーブル（読み取り専用。入力・削除は案件進捗管理で行う） */}
      <section className="print:hidden mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">日次実績（読み取り専用）</h2>
          <Link href={`/progress/${id}`} className="text-xs text-emerald-600 hover:underline">
            実績を入力する → 案件進捗管理
          </Link>
        </div>
        <div className="overflow-auto rounded-lg border border-slate-200">
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
                  <td colSpan={12} className="py-6 text-center text-slate-400">
                    記録がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <div className={`text-xs ${accent ? "text-emerald-600" : "text-slate-500"}`}>{label}</div>
      <div className={`text-lg font-bold tabular-nums ${accent ? "text-emerald-700" : "text-slate-800"}`}>{value}</div>
    </div>
  );
}
