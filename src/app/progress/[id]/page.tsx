import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatYen } from "@/lib/enums";
import { updateSalesUnit, deleteSalesUnit } from "@/lib/actions/salesUnits";
import { upsertDailyReport, deleteDailyReport } from "@/lib/actions/dailyReports";
import { DeleteButton } from "@/components/DeleteButton";
import { SubmitButton } from "@/components/SubmitButton";
import { ProgressChart, type ProgressPoint } from "@/components/ProgressChart";
import { AccountProductPicker } from "@/components/AccountProductPicker";
import {
  SALES_UNIT_STATUSES,
  weekSales,
  weekGap,
  effectiveTarget,
  weekAchievement,
  weekLabel,
  rollupWeeks,
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

  // 日次を金曜起点の週へロールアップ（週次断面はここから算出）
  const weeks = rollupWeeks(dailyReports);
  const latest = weeks[weeks.length - 1] ?? null;
  const chart: ProgressPoint[] = weeks.map((w) => ({
    week: weekLabel(w.weekStart),
    動画販売: w.videoSales,
    ライブ販売: w.liveSales,
    目標: effectiveTarget(w, unit.weeklyTarget) ?? 0,
  }));

  const cumSales = dailyReports.reduce((s, r) => s + (r.videoSales ?? 0) + (r.liveSales ?? 0), 0);
  const cumGmv = dailyReports.reduce((s, r) => s + (r.videoGmv ?? 0) + (r.liveGmv ?? 0), 0);
  const latestAch = latest ? weekAchievement(latest, unit.weeklyTarget) : null;
  const latestGap = latest ? weekGap(latest, unit.weeklyTarget) : null;

  // 活動記録（日次メモ）
  const activities = dailyReports
    .filter((r) => r.memo)
    .sort((a, b) => b.reportDate.getTime() - a.reportDate.getTime());

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <Link href={`/progress/accounts/${unit.accountId ?? "unassigned"}`} className="text-sm text-emerald-600 hover:underline">
            ← {unit.account?.name ?? "未分類（顧客未設定）"}
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

      {/* KPI（週次断面は日次の集計） */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Kpi label="直近週 販売" value={latest ? `${weekSales(latest)}` : "—"} accent />
        <Kpi label="直近週 達成率" value={latestAch == null ? "—" : `${latestAch}%`} />
        <Kpi label="直近週 目標差分" value={latestGap == null ? "—" : latestGap >= 0 ? `+${latestGap}` : `${latestGap}`} danger={(latestGap ?? 0) < 0} />
        <Kpi label="累計販売" value={`${cumSales}`} />
        <Kpi label="累計GMV" value={formatYen(cumGmv)} />
      </div>

      {/* トレンド（週次断面） */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">週次推移（販売数 vs 目標）<span className="ml-2 text-xs font-normal text-slate-400">日次実績を金曜起点の週で集計</span></h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          {chart.length === 0 ? (
            <p className="text-sm text-slate-400 py-10 text-center">記録がありません</p>
          ) : (
            <ProgressChart data={chart} />
          )}
        </div>
      </section>

      {/* 週次断面テーブル（日次からの自動集計・読み取り専用） */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">週次断面<span className="ml-2 text-xs font-normal text-slate-400">日次の合計を週（金〜木）でまとめた集計</span></h2>
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
              </tr>
            </thead>
            <tbody>
              {[...weeks].reverse().map((w) => {
                const gap = weekGap(w, unit.weeklyTarget);
                return (
                  <tr key={w.weekStart.getTime()} className="border-b border-slate-100">
                    <td className="py-2 px-3 font-medium">{weekLabel(w.weekStart)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{nz(effectiveTarget(w, unit.weeklyTarget))}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">{nz(w.videoPosts)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">{nz(w.videoPosters)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">{nz(w.videoSales)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">{w.videoGmv === 0 ? "—" : formatYen(w.videoGmv)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">{nz(w.liveCount)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">{nz(w.livePresenters)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">{nz(w.liveSales)}</td>
                    <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">{w.liveGmv === 0 ? "—" : formatYen(w.liveGmv)}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold">{weekSales(w)}</td>
                    <td className={`py-2 px-3 text-right tabular-nums font-medium ${(gap ?? 0) < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {gap == null ? "—" : gap >= 0 ? `+${gap}` : gap}
                    </td>
                  </tr>
                );
              })}
              {weeks.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-6 text-center text-slate-400">記録がありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 日次実績（唯一の入力窓口）: レポート機能「日次進捗報告」の元データ */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">日次実績<span className="ml-2 text-xs font-normal text-slate-400">ここに日々入力すると、上の週次断面とレポートに自動反映</span></h2>
          <Link href={`/reports/daily/${id}`} className="text-xs text-emerald-600 hover:underline">
            日次進捗報告レポートを見る →
          </Link>
        </div>
        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm bg-white">
            <thead>
              <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="py-2 px-3 font-medium">対象日</th>
                <th className="py-2 px-3 font-medium text-right bg-emerald-50/60">動画投稿</th>
                <th className="py-2 px-3 font-medium text-right bg-emerald-50/60">動画人数</th>
                <th className="py-2 px-3 font-medium text-right bg-emerald-50/60">動画販売</th>
                <th className="py-2 px-3 font-medium text-right bg-emerald-50/60">動画GMV</th>
                <th className="py-2 px-3 font-medium text-right bg-violet-50/60">ライブ回数</th>
                <th className="py-2 px-3 font-medium text-right bg-violet-50/60">ライブ人数</th>
                <th className="py-2 px-3 font-medium text-right bg-violet-50/60">ライブ販売</th>
                <th className="py-2 px-3 font-medium text-right bg-violet-50/60">ライブGMV</th>
                <th className="py-2 px-3 font-medium text-right">広告費</th>
                <th className="py-2 px-3 font-medium text-right">広告GMV</th>
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
                  <td className="py-2 px-3 font-medium whitespace-nowrap">{ymdUtc(r.reportDate)}</td>
                  <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">{nz(r.videoPosts)}</td>
                  <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">{nz(r.videoPosters)}</td>
                  <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">{nz(r.videoSales)}</td>
                  <td className="py-2 px-3 text-right tabular-nums bg-emerald-50/30">{r.videoGmv == null ? "—" : formatYen(r.videoGmv)}</td>
                  <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">{nz(r.liveCount)}</td>
                  <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">{nz(r.livePresenters)}</td>
                  <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">{nz(r.liveSales)}</td>
                  <td className="py-2 px-3 text-right tabular-nums bg-violet-50/30">{r.liveGmv == null ? "—" : formatYen(r.liveGmv)}</td>
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
                  <td colSpan={19} className="py-6 text-center text-slate-400">記録がありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 記録フォーム */}
        <form
          action={upsertDailyReport.bind(null, id)}
          className="mt-3 rounded-lg border border-slate-200 bg-white p-3"
        >
          <div className="text-sm font-medium text-slate-600 mb-2">日次実績を記録:</div>
          <div className="flex flex-wrap items-end gap-2">
            <Inp name="reportDate" label="対象日 *" type="date" required defaultValue={todayStr} w="w-36" />
            <FieldGroup label="動画（投稿系）">
              <Inp name="videoPosts" label="投稿数" type="number" />
              <Inp name="videoPosters" label="人数" type="number" />
              <Inp name="videoSales" label="販売数" type="number" />
              <Inp name="videoGmv" label="GMV" type="number" w="w-24" />
            </FieldGroup>
            <FieldGroup label="ライブ配信">
              <Inp name="liveCount" label="回数" type="number" />
              <Inp name="livePresenters" label="人数" type="number" />
              <Inp name="liveSales" label="販売数" type="number" />
              <Inp name="liveGmv" label="GMV" type="number" w="w-24" />
            </FieldGroup>
            <FieldGroup label="広告・配送">
              <Inp name="adSpend" label="広告費" type="number" w="w-24" />
              <Inp name="adGmv" label="広告GMV" type="number" w="w-24" />
              <Inp name="orderCount" label="注文数" type="number" />
              <Inp name="dailyBudget" label={`日予算(既定${unit.dailyAdBudget ?? "—"})`} type="number" w="w-28" />
              <Inp name="shippingQty" label="配送個数" type="number" w="w-24" />
              <Inp name="shippingAmount" label="配送金額" type="number" w="w-24" />
            </FieldGroup>
            <Inp name="memo" label="メモ / 活動記録" w="w-48" />
            <SubmitButton
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              pendingLabel="記録中…"
            >
              記録
            </SubmitButton>
          </div>
        </form>
        <p className="text-[11px] text-slate-400 mt-1">
          ※ 同じ対象日で記録すると上書きされます。ROI・CPA・日予算消化率は自動算出（保存はされません）。週次/月次の断面とレポートは、この日次実績を自動集計して表示されます。
        </p>
      </section>

      {/* 活動タイムライン（日次メモ） */}
      {activities.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">活動記録</h2>
          <ol className="relative border-l border-slate-200 ml-2">
            {activities.map((r) => (
              <li key={r.id} className="mb-3 ml-4">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                <div className="text-xs text-slate-400">{ymdUtc(r.reportDate)}</div>
                <p className="text-sm text-slate-700">{r.memo}</p>
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

/** 日次入力フォームの視覚的なグループ（動画/ライブ/広告） */
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      <div className="flex flex-wrap items-end gap-2 rounded-md border border-slate-100 bg-slate-50/50 p-2">
        {children}
      </div>
    </div>
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
