import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatYen } from "@/lib/enums";
import {
  sumReports,
  contentGmvTotal,
  resolvePeriod,
  previousPeriod,
  previousPeriodWord,
  periodQuery,
  trendPct,
  type DailyReportLike,
} from "@/lib/reports";
import { ReportRangePicker } from "@/components/ReportRangePicker";
import { TrendBadge, signedYen } from "@/components/TrendBadge";
import { assignUnitAccount } from "@/lib/actions/salesUnits";
import { unitBrandLabel } from "@/lib/progress";
import { ymdUtc } from "@/lib/period";

export const dynamic = "force-dynamic";

const DR_SELECT = { reportDate: true, videoPosts: true, videoSales: true, videoGmv: true, liveCount: true, liveSales: true, liveGmv: true, adSpend: true, adGmv: true, orderCount: true, dailyBudget: true, shippingQty: true, shippingAmount: true } as const;

/** 販売単位を期間集計してコンテンツGMV合計を出す */
function unitsContentGmv(
  units: { dailyReports: (DailyReportLike & { reportDate: Date })[] }[],
  start: Date,
  end: Date
): number {
  return units.reduce((sum, u) => {
    const inPeriod = u.dailyReports.filter((r) => r.reportDate >= start && r.reportDate < end);
    return sum + (contentGmvTotal(sumReports(inPeriod)) ?? 0);
  }, 0);
}

/** 1販売単位のコンテンツGMV（期間内） */
function oneUnitContentGmv(
  dailyReports: (DailyReportLike & { reportDate: Date })[],
  start: Date,
  end: Date
): number {
  const inPeriod = dailyReports.filter((r) => r.reportDate >= start && r.reportDate < end);
  return contentGmvTotal(sumReports(inPeriod)) ?? 0;
}

export default async function BrandsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; period?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const rp = resolvePeriod(sp);
  const prev = previousPeriod(rp);
  const query = periodQuery(rp);
  const prevWord = previousPeriodWord(rp);

  const [accounts, allAccounts, unassigned] = await Promise.all([
    prisma.account.findMany({
      where: { salesUnits: { some: {} } },
      include: { salesUnits: { include: { dailyReports: { select: DR_SELECT } } } },
      orderBy: { name: "asc" },
    }),
    // クイック割当のプルダウン用（全顧客）
    prisma.account.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    // 顧客未設定の販売単位（どのメーカーにも集計されていない＝取りこぼし）
    prisma.salesUnit.findMany({
      where: { accountId: null },
      include: { dailyReports: { select: DR_SELECT }, account: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const rows = accounts
    .map((a) => ({
      a,
      gmv: unitsContentGmv(a.salesUnits, rp.start, rp.end),
      prevGmv: unitsContentGmv(a.salesUnits, prev.start, prev.end),
      unitCount: a.salesUnits.length,
    }))
    .sort((x, y) => y.gmv - x.gmv);

  // 未分類（顧客未設定）: 期間内コンテンツGMVを付けてGMV降順
  const unassignedRows = unassigned
    .map((u) => ({ u, gmv: oneUnitContentGmv(u.dailyReports, rp.start, rp.end) }))
    .sort((x, y) => y.gmv - x.gmv);
  const unassignedGmv = unassignedRows.reduce((s, x) => s + x.gmv, 0);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-2">
        <Link href="/reports" className="text-sm text-emerald-600 hover:underline">← レポート</Link>
      </div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xl">🏭</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">メーカー別レポート</h1>
            <p className="text-sm text-slate-500">{rp.label} の顧客（メーカー）別 コンテンツ売上</p>
          </div>
        </div>
        <ReportRangePicker kind={rp.kind} date={ymdUtc(rp.start)} from={sp.from} to={sp.to} />
      </div>

      {rows.length === 0 && unassignedRows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">販売単位がありません。</p>
          <p className="mt-1 text-xs text-slate-400">案件進捗管理で販売単位を追加し、顧客（メーカー）を割り当てると、ここにメーカー別レポートが表示されます。</p>
        </div>
      ) : (
        <>
          {rows.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map(({ a, gmv, prevGmv, unitCount }) => (
                <Link
                  key={a.id}
                  href={`/reports/brands/${a.id}?${query}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {a.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.logoUrl} alt={a.name} className="h-8 w-8 rounded object-contain border border-slate-200 bg-white" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">
                        {a.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{a.name}</div>
                      <div className="text-[11px] text-slate-400">販売単位 {unitCount} 件</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">コンテンツ経由の売上</div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-emerald-700 tabular-nums">{formatYen(gmv)}</span>
                    <span className="mb-1">
                      <TrendBadge deltaPct={trendPct(gmv, prevGmv)} deltaAbs={signedYen(gmv, prevGmv)} suffix={`vs ${prevWord}`} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              顧客に紐づいた販売単位がまだありません。下の「未分類」から顧客を割り当ててください。
            </p>
          )}

          {/* 未分類（顧客未設定）: 取りこぼしの可視化＋クイック割当 */}
          {unassignedRows.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                <h2 className="text-sm font-semibold text-amber-700">
                  未分類（顧客未設定） {unassignedRows.length} 件
                </h2>
                <span className="text-xs text-amber-700">
                  この期間のコンテンツ売上 <strong className="tabular-nums">{formatYen(unassignedGmv)}</strong> がどのメーカーにも計上されていません
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                顧客（メーカー）を割り当てると、上のメーカー別レポートに反映されます。
              </p>
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 divide-y divide-amber-100">
                {unassignedRows.map(({ u, gmv }) => (
                  <div key={u.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                    <div className="w-48 shrink-0 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{u.productSku ?? unitBrandLabel(u)}</div>
                      <div className="text-[11px] text-slate-400 truncate">{u.brand}{u.store ? ` ・ ${u.store}` : ""}</div>
                    </div>
                    <div className="w-32 shrink-0 text-right">
                      <div className="text-[11px] text-slate-400">コンテンツ売上</div>
                      <div className="text-sm font-semibold text-slate-800 tabular-nums">{formatYen(gmv)}</div>
                    </div>
                    <form action={assignUnitAccount.bind(null, u.id)} className="flex items-center gap-2 ml-auto">
                      <select
                        name="accountId"
                        defaultValue=""
                        required
                        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-500 max-w-[12rem]"
                      >
                        <option value="" disabled>顧客を選択…</option>
                        {allAccounts.map((ac) => (
                          <option key={ac.id} value={ac.id}>{ac.name}</option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                      >
                        割当
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
