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
import { ymdUtc } from "@/lib/period";

export const dynamic = "force-dynamic";

/** 顧客（メーカー）配下の全販売単位を期間集計してコンテンツGMV合計を出す */
function accountContentGmv(
  units: {
    dailyReports: (DailyReportLike & { reportDate: Date })[];
  }[],
  start: Date,
  end: Date
): number {
  return units.reduce((sum, u) => {
    const inPeriod = u.dailyReports.filter((r) => r.reportDate >= start && r.reportDate < end);
    const agg = sumReports(inPeriod);
    return sum + (contentGmvTotal(agg) ?? 0);
  }, 0);
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

  const accounts = await prisma.account.findMany({
    where: { salesUnits: { some: {} } },
    include: {
      salesUnits: {
        include: {
          dailyReports: { select: { reportDate: true, videoPosts: true, videoSales: true, videoGmv: true, liveCount: true, liveSales: true, liveGmv: true, adSpend: true, adGmv: true, orderCount: true, dailyBudget: true, shippingQty: true, shippingAmount: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = accounts
    .map((a) => ({
      a,
      gmv: accountContentGmv(a.salesUnits, rp.start, rp.end),
      prevGmv: accountContentGmv(a.salesUnits, prev.start, prev.end),
      unitCount: a.salesUnits.length,
    }))
    .sort((x, y) => y.gmv - x.gmv);

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-1">
        <Link href="/reports" className="text-sm text-emerald-600 hover:underline">← レポート</Link>
      </div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">メーカー別レポート</h1>
          <p className="text-sm text-slate-500">{rp.label} の顧客（メーカー）別 コンテンツ売上</p>
        </div>
        <ReportRangePicker kind={rp.kind} date={ymdUtc(rp.start)} from={sp.from} to={sp.to} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">顧客に紐づいた販売単位がありません。</p>
          <p className="mt-1 text-xs text-slate-400">案件進捗管理で販売単位に顧客を割り当てると、ここにメーカー別レポートが表示されます。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map(({ a, gmv, prevGmv, unitCount }) => (
            <Link
              key={a.id}
              href={`/reports/brands/${a.id}?${query}`}
              className="rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-300 hover:shadow-sm transition-all"
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
      )}
    </div>
  );
}
