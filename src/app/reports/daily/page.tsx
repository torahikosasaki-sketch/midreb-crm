import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatYen } from "@/lib/enums";
import {
  roi,
  cpa,
  budgetConsumptionRate,
  effectiveDailyBudget,
  sumReports,
  normalizeAnchor,
  periodRange,
  periodLabel,
  ymdUtc,
  type Period,
} from "@/lib/reports";
import { ReportPeriodPicker } from "@/components/ReportPeriodPicker";
import { PrintButton } from "@/components/PrintButton";
import { unitBrandLabel } from "@/lib/progress";

export const dynamic = "force-dynamic";

const nz = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("ja-JP"));
const pct = (n: number | null) => (n == null ? "—" : `${n}%`);

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
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

  const units = await prisma.salesUnit.findMany({
    where: { status: "稼働中" },
    include: {
      dailyReports: { where: { reportDate: { gte: start, lt: end } } },
      account: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const rows = units.map((u) => {
    const r = sumReports(u.dailyReports);
    return {
      u,
      r,
      roi: roi(r),
      cpa: cpa(r),
      rate: budgetConsumptionRate(r, u.dailyAdBudget),
    };
  });

  // サマリ（合計から再計算。個別ROI等の平均は取らない）
  const totalAdSpend = rows.reduce((s, x) => s + (x.r.adSpend ?? 0), 0);
  const totalGmv = rows.reduce((s, x) => s + (x.r.adGmv ?? 0), 0);
  const totalOrders = rows.reduce((s, x) => s + (x.r.orderCount ?? 0), 0);
  const totalBudget = rows.reduce((s, x) => s + (effectiveDailyBudget(x.r, x.u.dailyAdBudget) ?? 0), 0);
  const totalVideoPosts = rows.reduce((s, x) => s + (x.r.videoPosts ?? 0), 0);
  const totalLiveCount = rows.reduce((s, x) => s + (x.r.liveCount ?? 0), 0);
  const totalShippingQty = rows.reduce((s, x) => s + (x.r.shippingQty ?? 0), 0);
  const totalShippingAmount = rows.reduce((s, x) => s + (x.r.shippingAmount ?? 0), 0);
  const totalRoi = totalAdSpend > 0 ? Math.round((totalGmv / totalAdSpend) * 1000) / 10 : null;
  const totalCpa = totalOrders > 0 ? Math.round(totalAdSpend / totalOrders) : null;
  const totalRate = totalBudget > 0 ? Math.round((totalAdSpend / totalBudget) * 1000) / 10 : null;

  return (
    <div className="p-6 max-w-7xl">
      <div className="print:hidden mb-1">
        <Link href="/reports" className="text-sm text-emerald-600 hover:underline">
          ← レポート
        </Link>
      </div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">日次進捗報告</h1>
          <p className="text-sm text-slate-500">{periodLabel(period, anchor)} の実績（稼働中の販売単位）</p>
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

      {/* サマリKPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden mb-4">
        <Kpi label="動画投稿数" value={nz(totalVideoPosts)} />
        <Kpi label="ライブ実施回数" value={nz(totalLiveCount)} />
        <Kpi label="広告費" value={formatYen(totalAdSpend)} />
        <Kpi label="売上(GMV)" value={formatYen(totalGmv)} accent />
        <Kpi label="ROI" value={pct(totalRoi)} />
        <Kpi label="注文数" value={nz(totalOrders)} />
        <Kpi label="CPA" value={totalCpa == null ? "—" : formatYen(totalCpa)} />
        <Kpi label="日予算消化率" value={pct(totalRate)} />
      </div>
      <div className="grid grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden mb-6 max-w-md">
        <Kpi label="配送 売上個数" value={nz(totalShippingQty)} />
        <Kpi label="配送 売上金額" value={formatYen(totalShippingAmount)} />
      </div>

      {/* 販売単位別テーブル */}
      <div className="overflow-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm bg-white">
          <thead>
            <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
              <th className="py-2 px-3 font-medium">販売単位</th>
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
            </tr>
          </thead>
          <tbody>
            {rows.map(({ u, r, roi: rRoi, cpa: rCpa, rate }) => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-3">
                  <Link
                    href={`/reports/daily/${u.id}?date=${anchorStr}&period=${period}`}
                    className="font-medium text-slate-800 hover:text-emerald-700 hover:underline"
                  >
                    {u.productSku ?? unitBrandLabel(u)}
                  </Link>
                  <div className="text-[11px] text-slate-400">{unitBrandLabel(u)}</div>
                </td>
                <td className="py-2 px-3 text-right tabular-nums">{nz(r.videoPosts)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{nz(r.liveCount)}</td>
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="py-6 text-center text-slate-400">
                  稼働中の販売単位がありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="print:hidden text-[11px] text-slate-400 mt-2">
        販売単位名をクリックすると、推移・出力ができる詳細画面に移動します。実績の入力・修正は「案件進捗管理」から行えます。
      </p>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`px-4 py-3 ${accent ? "bg-emerald-50" : "bg-white"}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-base font-bold tabular-nums ${accent ? "text-emerald-700" : "text-slate-800"}`}>
        {value}
      </div>
    </div>
  );
}
