import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatYen } from "@/lib/enums";
import { ymd } from "@/lib/progress";
import { roi, cpa, budgetConsumptionRate, dayLabel } from "@/lib/reports";
import { upsertDailyReport, deleteDailyReport } from "@/lib/actions/dailyReports";
import { SubmitButton } from "@/components/SubmitButton";
import { PrintButton } from "@/components/PrintButton";
import { ReportDatePicker } from "@/components/ReportDatePicker";
import { DailyAdChart, CreativeChart, type DailyAdPoint, type CreativePoint } from "@/components/DailyReportChart";

export const dynamic = "force-dynamic";

const nz = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("ja-JP"));
const pct = (n: number | null) => (n == null ? "—" : `${n}%`);

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function DailyReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { id } = await params;
  const { date } = await searchParams;
  const dateStr = date ?? todayStr();

  const unit = await prisma.salesUnit.findUnique({
    where: { id },
    include: { dailyReports: { orderBy: { reportDate: "asc" } } },
  });
  if (!unit) notFound();

  const reports = unit.dailyReports;
  const selected = reports.find((r) => ymd(r.reportDate) === dateStr) ?? null;

  const selRoi = selected ? roi(selected) : null;
  const selCpa = selected ? cpa(selected) : null;
  const selRate = selected ? budgetConsumptionRate(selected, unit.dailyAdBudget) : null;

  // 直近30日分の推移
  const recent = reports.slice(-30);
  const adChartData: DailyAdPoint[] = recent.map((r) => ({
    day: dayLabel(r.reportDate),
    広告費: r.adSpend ?? 0,
    売上GMV: r.adGmv ?? 0,
    ROI: roi(r),
  }));
  const creativeChartData: CreativePoint[] = recent.map((r) => ({
    day: dayLabel(r.reportDate),
    動画投稿数: r.videoPosts ?? 0,
    ライブ実施回数: r.liveCount ?? 0,
  }));

  return (
    <div className="p-6 max-w-6xl">
      <div className="print:hidden mb-1">
        <Link href={`/reports/daily?date=${dateStr}`} className="text-sm text-emerald-600 hover:underline">
          ← 日次進捗報告
        </Link>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">{unit.productSku ?? unit.brand}</h1>
          <p className="text-sm text-slate-500">
            {unit.brand}
            {unit.store ? ` ・ ${unit.store}` : ""} ・ {dateStr} の日次進捗報告
          </p>
        </div>
        <div className="print:hidden flex items-center gap-2">
          <ReportDatePicker date={dateStr} />
          <PrintButton />
        </div>
      </div>

      {/* 選択日のKPI（印刷対象） */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Kpi label="動画投稿数" value={nz(selected?.videoPosts)} />
        <Kpi label="ライブ実施回数" value={nz(selected?.liveCount)} />
        <Kpi label="広告費" value={selected?.adSpend == null ? "—" : formatYen(selected.adSpend)} />
        <Kpi label="売上(GMV)" value={selected?.adGmv == null ? "—" : formatYen(selected.adGmv)} accent />
        <Kpi label="ROI" value={pct(selRoi)} />
        <Kpi label="注文数" value={nz(selected?.orderCount)} />
        <Kpi label="CPA" value={selCpa == null ? "—" : formatYen(selCpa)} />
        <Kpi label="日予算消化率" value={pct(selRate)} />
        <Kpi label="配送 売上個数" value={nz(selected?.shippingQty)} />
        <Kpi label="配送 売上金額" value={selected?.shippingAmount == null ? "—" : formatYen(selected.shippingAmount)} />
      </div>
      {!selected && (
        <p className="print:hidden text-sm text-slate-400 -mt-6 mb-8">
          {dateStr} の記録はまだありません。下のフォームから入力してください。
        </p>
      )}

      {/* 推移グラフ */}
      <div className="print:hidden grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">広告費・GMV・ROI 推移（直近30日）</h2>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            {adChartData.length === 0 ? (
              <p className="text-sm text-slate-400 py-10 text-center">記録がありません</p>
            ) : (
              <DailyAdChart data={adChartData} />
            )}
          </div>
        </section>
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">クリエイティブ推移（直近30日）</h2>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            {creativeChartData.length === 0 ? (
              <p className="text-sm text-slate-400 py-10 text-center">記録がありません</p>
            ) : (
              <CreativeChart data={creativeChartData} />
            )}
          </div>
        </section>
      </div>

      {/* 日次テーブル */}
      <section className="print:hidden mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">日次実績</h2>
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
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {[...reports].reverse().map((r) => (
                <tr key={r.id} className={`border-b border-slate-100 ${ymd(r.reportDate) === dateStr ? "bg-emerald-50/40" : ""}`}>
                  <td className="py-2 px-3 font-medium">
                    <Link href={`/reports/daily/${id}?date=${ymd(r.reportDate)}`} className="hover:text-emerald-700 hover:underline">
                      {ymd(r.reportDate)}
                    </Link>
                  </td>
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
                  <td className="py-2 px-2 text-right">
                    <form action={deleteDailyReport.bind(null, r.id, id)}>
                      <button type="submit" className="text-xs text-slate-400 hover:text-rose-600">
                        削除
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={13} className="py-6 text-center text-slate-400">
                    記録がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 記録フォーム */}
        <form
          action={upsertDailyReport.bind(null, id)}
          className="flex flex-wrap items-end gap-2 mt-3 rounded-lg border border-slate-200 bg-white p-3"
        >
          <span className="text-sm font-medium text-slate-600 mr-1 w-full md:w-auto">実績を記録:</span>
          <Inp name="reportDate" label="対象日 *" type="date" required defaultValue={dateStr} w="w-36" />
          <Inp name="videoPosts" label="動画投稿数" type="number" />
          <Inp name="liveCount" label="ライブ実施回数" type="number" />
          <Inp name="adSpend" label="広告費" type="number" w="w-24" />
          <Inp name="adGmv" label="売上(GMV)" type="number" w="w-24" />
          <Inp name="orderCount" label="注文数" type="number" />
          <Inp name="dailyBudget" label={`日予算(既定${unit.dailyAdBudget ?? "—"})`} type="number" w="w-28" />
          <Inp name="shippingQty" label="配送 売上個数" type="number" w="w-24" />
          <Inp name="shippingAmount" label="配送 売上金額" type="number" w="w-24" />
          <Inp name="memo" label="メモ" w="w-48" />
          <SubmitButton
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            pendingLabel="記録中…"
          >
            記録
          </SubmitButton>
        </form>
        <p className="text-[11px] text-slate-400 mt-1">
          ※ 同じ対象日で記録すると上書きされます。ROI・CPA・日予算消化率は自動算出（保存はされません）。
        </p>
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

function Inp({
  name,
  label,
  type = "text",
  required,
  defaultValue,
  w = "w-20",
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  w?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-slate-500">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className={`rounded-md border border-slate-300 px-2 py-1.5 text-sm ${w}`}
      />
    </label>
  );
}
