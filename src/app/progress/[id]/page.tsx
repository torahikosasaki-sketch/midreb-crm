import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatYen } from "@/lib/enums";
import { updateSalesUnit, deleteSalesUnit } from "@/lib/actions/salesUnits";
import { createWeek, deleteWeek } from "@/lib/actions/progress";
import { upsertDailyReport, deleteDailyReport } from "@/lib/actions/dailyReports";
import { DeleteButton } from "@/components/DeleteButton";
import { SubmitButton } from "@/components/SubmitButton";
import { ProgressChart, type ProgressPoint } from "@/components/ProgressChart";
import { AccountProductPicker } from "@/components/AccountProductPicker";
import {
  SALES_UNIT_STATUSES,
  weekSales,
  weekGmv,
  weekGap,
  effectiveTarget,
  weekAchievement,
  weekLabel,
  ymd,
} from "@/lib/progress";
import { roi, cpa, budgetConsumptionRate, ymdUtc } from "@/lib/reports";

export const dynamic = "force-dynamic";

const nz = (n: number | null) => (n == null ? "—" : n.toLocaleString("ja-JP"));

export default async function SalesUnitDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [unit, accounts] = await Promise.all([
    prisma.salesUnit.findUnique({
      where: { id },
      include: {
        weeks: { orderBy: { weekStart: "asc" } },
        dailyReports: { orderBy: { reportDate: "asc" } },
        account: { select: { id: true, name: true } },
      },
    }),
    prisma.account.findMany({
      select: { id: true, name: true, products: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!unit) notFound();

  const dailyReports = unit.dailyReports;
  const todayStr = new Date().toISOString().slice(0, 10);

  const weeks = unit.weeks;
  const latest = weeks[weeks.length - 1] ?? null;
  const chart: ProgressPoint[] = weeks.map((w) => ({
    week: weekLabel(w.weekStart),
    動画販売: w.videoSales ?? 0,
    ライブ販売: w.liveSales ?? 0,
    目標: effectiveTarget(w, unit.weeklyTarget),
  }));

  const cumSales = weeks.reduce((s, w) => s + weekSales(w), 0);
  const cumGmv = weeks.reduce((s, w) => s + weekGmv(w), 0);
  const latestAch = latest ? weekAchievement(latest, unit.weeklyTarget) : null;
  const latestGap = latest ? weekGap(latest, unit.weeklyTarget) : null;

  const activities = weeks
    .filter((w) => w.activityNote)
    .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <Link href="/progress" className="text-sm text-emerald-600 hover:underline">
            ← 案件進捗管理
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-xl font-bold">{unit.productSku ?? unit.brand}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                unit.status === "終了" ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {unit.status}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {unit.account?.name ?? unit.brand}
            {unit.store ? ` ・ ${unit.store}` : ""} ・ 週次目標 {unit.weeklyTarget ?? "—"}
          </p>
        </div>
        <DeleteButton action={deleteSalesUnit.bind(null, id)} label="販売単位を削除" />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Kpi label="直近週 販売" value={latest ? `${weekSales(latest)}` : "—"} accent />
        <Kpi label="直近週 達成率" value={latestAch == null ? "—" : `${latestAch}%`} />
        <Kpi label="直近週 目標差分" value={latestGap == null ? "—" : latestGap >= 0 ? `+${latestGap}` : `${latestGap}`} danger={(latestGap ?? 0) < 0} />
        <Kpi label="累計販売" value={`${cumSales}`} />
        <Kpi label="累計GMV" value={formatYen(cumGmv)} />
      </div>

      {/* トレンド */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">週次推移（販売数 vs 目標）</h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          {chart.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">記録がありません</p>
          ) : (
            <ProgressChart data={chart} />
          )}
        </div>
      </section>

      {/* 週次テーブル */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">週次実績</h2>
        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm bg-white">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="py-2 px-3 font-medium">週</th>
                <th className="py-2 px-3 font-medium text-right">目標</th>
                <th className="py-2 px-3 font-medium text-right bg-emerald-50/60">動画投稿</th>
                <th className="py-2 px-3 font-medium text-right bg-emerald-50/60">動画人数</th>
                <th className="py-2 px-3 font-medium text-right bg-emerald-50/60">動画販売</th>
                <th className="py-2 px-3 font-medium text-right bg-emerald-50/60">動画GMV</th>
                <th className="py-2 px-3 font-medium text-right bg-violet-50/60">ライブ回数</th>
                <th className="py-2 px-3 font-medium text-right bg-violet-50/60">ライブ人数</th>
                <th className="py-2 px-3 font-medium text-right bg-violet-50/60">ライブ販売</th>
                <th className="py-2 px-3 font-medium text-right bg-violet-50/60">ライブGMV</th>
                <th className="py-2 px-3 font-medium text-right">総販売</th>
                <th className="py-2 px-3 font-medium text-right">差分</th>
                <th className="py-2 px-3 font-medium">活動記録</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {[...weeks].reverse().map((w) => {
                const gap = weekGap(w, unit.weeklyTarget);
                return (
                  <tr key={w.id} className="border-b border-slate-100">
                    <td className="py-2 px-3 font-medium">{weekLabel(w.weekStart)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{nz(effectiveTarget(w, unit.weeklyTarget))}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">{nz(w.videoPosts)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">{nz(w.videoPosters)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">{nz(w.videoSales)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">{w.videoGmv == null ? "—" : formatYen(w.videoGmv)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">{nz(w.liveCount)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">{nz(w.livePresenters)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">{nz(w.liveSales)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">{w.liveGmv == null ? "—" : formatYen(w.liveGmv)}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold">{weekSales(w)}</td>
                    <td className={`py-2 px-3 text-right tabular-nums font-medium ${(gap ?? 0) < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {gap == null ? "—" : gap >= 0 ? `+${gap}` : gap}
                    </td>
                    <td className="py-2 px-3 text-slate-600 text-xs max-w-48">{w.activityNote ?? "—"}</td>
                    <td className="py-2 px-2 text-right">
                      <form action={deleteWeek.bind(null, w.id, id)}>
                        <button type="submit" className="text-xs text-slate-400 hover:text-rose-600">削除</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {weeks.length === 0 && (
                <tr>
                  <td colSpan={14} className="py-6 text-center text-slate-400">記録がありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 記録フォーム（商品固定・数値だけ） */}
        <form action={createWeek.bind(null, id)} className="flex flex-wrap items-end gap-2 mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <span className="text-sm font-medium text-slate-600 mr-1 w-full md:w-auto">今週の実績を記録:</span>
          <Inp name="weekStart" label="週開始日 *" type="date" required w="w-36" />
          <Inp name="targetCount" label={`目標(既定${unit.weeklyTarget ?? "—"})`} type="number" w="w-24" />
          <Inp name="videoPosts" label="動画投稿" type="number" />
          <Inp name="videoPosters" label="動画人数" type="number" />
          <Inp name="videoSales" label="動画販売" type="number" />
          <Inp name="videoGmv" label="動画GMV" type="number" w="w-24" />
          <Inp name="liveCount" label="ライブ回数" type="number" />
          <Inp name="livePresenters" label="ライブ人数" type="number" />
          <Inp name="liveSales" label="ライブ販売" type="number" />
          <Inp name="liveGmv" label="ライブGMV" type="number" w="w-24" />
          <Inp name="activityNote" label="活動記録" w="w-48" />
          <SubmitButton className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700" pendingLabel="記録中…">
            記録
          </SubmitButton>
        </form>
        <p className="text-[11px] text-slate-400 mt-1">※ 同じ週開始日で記録すると上書きされます。差分は自動算出（総販売 − 目標）。</p>
      </section>

      {/* 日次実績（広告・配送・クリエイティブ）: レポート機能「日次進捗報告」の元データ */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">日次実績（広告・配送）</h2>
          <Link href={`/reports/daily/${id}`} className="text-xs text-emerald-600 hover:underline">
            日次進捗報告レポートを見る →
          </Link>
        </div>
        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm bg-white">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="py-2 px-3 font-medium">対象日</th>
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
              {[...dailyReports].reverse().map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 px-3 font-medium">{ymdUtc(r.reportDate)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{nz(r.videoPosts)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{nz(r.liveCount)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.adSpend == null ? "—" : formatYen(r.adSpend)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.adGmv == null ? "—" : formatYen(r.adGmv)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{roi(r) == null ? "—" : `${roi(r)}%`}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{nz(r.orderCount)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{cpa(r) == null ? "—" : formatYen(cpa(r)!)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {budgetConsumptionRate(r, unit.dailyAdBudget) == null ? "—" : `${budgetConsumptionRate(r, unit.dailyAdBudget)}%`}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{nz(r.shippingQty)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{r.shippingAmount == null ? "—" : formatYen(r.shippingAmount)}</td>
                  <td className="py-2 px-3 text-slate-600 text-xs max-w-40 truncate">{r.memo ?? "—"}</td>
                  <td className="py-2 px-2 text-right">
                    <form action={deleteDailyReport.bind(null, r.id, id)}>
                      <button type="submit" className="text-xs text-slate-400 hover:text-rose-600">削除</button>
                    </form>
                  </td>
                </tr>
              ))}
              {dailyReports.length === 0 && (
                <tr>
                  <td colSpan={13} className="py-6 text-center text-slate-400">記録がありません</td>
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
          <span className="text-sm font-medium text-slate-600 mr-1 w-full md:w-auto">日次実績を記録:</span>
          <Inp name="reportDate" label="対象日 *" type="date" required defaultValue={todayStr} w="w-36" />
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
          ※ 同じ対象日で記録すると上書きされます。ROI・CPA・日予算消化率は自動算出（保存はされません）。この実績は「レポート」の日次進捗報告に反映されます。
        </p>
      </section>

      {/* 活動タイムライン */}
      {activities.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">活動記録</h2>
          <ol className="relative border-l border-slate-200 ml-2">
            {activities.map((w) => (
              <li key={w.id} className="mb-3 ml-4">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                <div className="text-xs text-slate-400">{weekLabel(w.weekStart)}</div>
                <p className="text-sm text-slate-700">{w.activityNote}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 販売単位の設定 */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">販売単位の設定</h2>
        <form action={updateSalesUnit.bind(null, id)} className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl">
          <AccountProductPicker
            accounts={accounts}
            defaultAccountId={unit.accountId}
            defaultProductId={unit.productId}
          />
          <Field label="ブランド *">
            <input name="brand" required defaultValue={unit.brand} className={inputCls} />
          </Field>
          <Field label="商品名/SKU">
            <input name="productSku" defaultValue={unit.productSku ?? ""} className={inputCls} />
          </Field>
          <Field label="ストア">
            <input name="store" defaultValue={unit.store ?? ""} className={inputCls} />
          </Field>
          <Field label="週次目標（販売数）">
            <input name="weeklyTarget" type="number" defaultValue={unit.weeklyTarget ?? ""} className={inputCls} />
          </Field>
          <Field label="日予算（広告費・レポート用）">
            <input name="dailyAdBudget" type="number" defaultValue={unit.dailyAdBudget ?? ""} className={inputCls} />
          </Field>
          <Field label="状態">
            <select name="status" defaultValue={unit.status} className={inputCls}>
              {SALES_UNIT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="メモ">
            <input name="memo" defaultValue={unit.memo ?? ""} className={inputCls} />
          </Field>
          <div className="col-span-2 md:col-span-3">
            <SubmitButton className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700" pendingLabel="保存中…">
              保存
            </SubmitButton>
          </div>
        </form>
      </section>
    </div>
  );
}

const inputCls = "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-600 font-medium text-xs">{label}</span>
      {children}
    </label>
  );
}

function Kpi({ label, value, accent, danger }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${danger ? "border-rose-200 bg-rose-50" : accent ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      <div className={`text-xs ${danger ? "text-rose-500" : "text-slate-500"}`}>{label}</div>
      <div className={`text-lg font-bold tabular-nums ${danger ? "text-rose-700" : accent ? "text-emerald-700" : "text-slate-800"}`}>{value}</div>
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
