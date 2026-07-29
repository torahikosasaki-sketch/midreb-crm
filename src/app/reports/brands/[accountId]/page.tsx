import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatYen } from "@/lib/enums";
import {
  roi,
  cpa,
  effectiveDailyBudget,
  sumReports,
  contentGmvTotal,
  resolvePeriod,
  previousPeriod,
  previousPeriodWord,
  periodQuery,
  periodKey,
  bucketConfig,
  recentBuckets,
  trendPct,
  buildInsights,
  ymdUtc,
  type DailyReportLike,
} from "@/lib/reports";
import { getReportNote } from "@/lib/actions/reportNotes";
import { PrintButton } from "@/components/PrintButton";
import { ReportRangePicker } from "@/components/ReportRangePicker";
import { TrendBadge, signedYen } from "@/components/TrendBadge";
import { StatTile } from "@/components/StatTile";
import { SummaryEditor } from "@/components/SummaryEditor";
import { CompositionBar } from "@/components/CompositionBar";
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

type UnitWithData = {
  id: string;
  brand: string;
  productSku: string | null;
  dailyAdBudget: number | null;
  account: { name: string } | null;
  dailyReports: (DailyReportLike & { reportDate: Date })[];
};

/** 顧客配下の全販売単位を期間集計し、合算値と有効予算合計を返す */
function aggregateUnits(units: UnitWithData[], start: Date, end: Date): { agg: DailyReportLike; budget: number } {
  const perUnit = units.map((u) => {
    const inPeriod = u.dailyReports.filter((r) => r.reportDate >= start && r.reportDate < end);
    return { agg: sumReports(inPeriod), unit: u };
  });
  const pick = (k: keyof DailyReportLike) =>
    perUnit.reduce((s, x) => s + ((x.agg[k] as number | null | undefined) ?? 0), 0);
  const agg: DailyReportLike = {
    videoPosts: pick("videoPosts"),
    liveCount: pick("liveCount"),
    videoGmv: pick("videoGmv"),
    liveGmv: pick("liveGmv"),
    adSpend: pick("adSpend"),
    adGmv: pick("adGmv"),
    orderCount: pick("orderCount"),
    shippingQty: pick("shippingQty"),
    shippingAmount: pick("shippingAmount"),
  };
  const budget = perUnit.reduce((s, x) => s + (effectiveDailyBudget(x.agg, x.unit.dailyAdBudget) ?? 0), 0);
  return { agg, budget };
}

export default async function BrandReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ date?: string; period?: string; from?: string; to?: string; audience?: string }>;
}) {
  const { accountId } = await params;
  const sp = await searchParams;
  const rp = resolvePeriod(sp);
  const prev = previousPeriod(rp);
  const query = periodQuery(rp);
  const prevWord = previousPeriodWord(rp);
  const pKey = periodKey(rp);
  // 顧客向けモード: 広告費・ROI・CPA・日予算などの社内指標を出力から除外する
  const isClient = sp.audience === "client";
  const viewQuery = isClient ? `${query}&audience=client` : query;

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      salesUnits: {
        include: {
          dailyReports: { orderBy: { reportDate: "asc" } },
          account: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!account) notFound();

  const units = account.salesUnits as unknown as UnitWithData[];
  const note = await getReportNote("account", accountId, pKey);

  const { agg: cur, budget } = aggregateUnits(units, rp.start, rp.end);
  const { agg: previous, budget: prevBudget } = aggregateUnits(units, prev.start, prev.end);

  const curRoi = roi(cur);
  const prevRoi = roi(previous);
  const curCpa = cpa(cur);
  const prevCpa = cpa(previous);
  const curRate = budget > 0 ? Math.round(((cur.adSpend ?? 0) / budget) * 1000) / 10 : null;
  const prevRate = prevBudget > 0 ? Math.round(((previous.adSpend ?? 0) / prevBudget) * 1000) / 10 : null;
  const curContentGmv = contentGmvTotal(cur);
  const prevContentGmv = contentGmvTotal(previous);

  const insights = buildInsights({
    prevWord,
    current: cur,
    previous,
    roiCur: curRoi,
    roiPrev: prevRoi,
    cpaCur: curCpa,
    cpaPrev: prevCpa,
    budgetRate: curRate,
    hideAdMetrics: isClient,
  });

  // 販売単位別 コンテンツ売上（ランキング）
  const perUnitRanked = units
    .map((u) => {
      const inPeriod = u.dailyReports.filter((r) => r.reportDate >= rp.start && r.reportDate < rp.end);
      const a = sumReports(inPeriod);
      return { u, contentGmv: contentGmvTotal(a) ?? 0, video: a.videoGmv ?? 0 };
    })
    .sort((x, y) => y.contentGmv - x.contentGmv);
  const maxContentGmv = Math.max(1, ...perUnitRanked.map((x) => x.contentGmv));

  // 推移グラフ（顧客配下の全DailyReportを集約）
  const allReports = units.flatMap((u) => u.dailyReports);
  const bc = bucketConfig(rp);
  const bucketUnitLabel = bc.unit === "day" ? "日" : bc.unit === "week" ? "週" : "ヶ月";
  const trendSuffix = `直近${bc.count}${bucketUnitLabel}`;
  const buckets = recentBuckets(allReports, rp);
  const adChartData: DailyAdPoint[] = buckets.map((b) => ({ day: b.label, 広告費: b.data.adSpend ?? 0, 売上GMV: b.data.adGmv ?? 0 }));
  const roiChartData: RoiPoint[] = buckets.map((b) => ({ day: b.label, ROI: roi(b.data) }));
  const creativeChartData: CreativePoint[] = buckets.map((b) => ({ day: b.label, 動画投稿数: b.data.videoPosts ?? 0, ライブ実施回数: b.data.liveCount ?? 0 }));
  const channelGmvChartData: ChannelGmvPoint[] = buckets.map((b) => ({ day: b.label, 動画GMV: b.data.videoGmv ?? 0, ライブGMV: b.data.liveGmv ?? 0 }));
  const hasChannelGmv = buckets.some((b) => b.data.videoGmv != null || b.data.liveGmv != null);
  const hasAdData = allReports.some((r) => r.adSpend != null || r.adGmv != null);

  const summaryTitle =
    rp.kind === "day" ? "本日のサマリー" : rp.kind === "week" ? "今週のサマリー" : rp.kind === "month" ? "今月のサマリー" : "期間のサマリー";

  return (
    <div className="p-6 max-w-6xl">
      <div className="print:hidden mb-1">
        <Link href={`/reports/brands?${query}`} className="text-sm text-emerald-600 hover:underline">← メーカー別レポート</Link>
      </div>

      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {account.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.logoUrl} alt={account.name} className="h-10 w-10 rounded-lg object-contain border border-slate-200 bg-white" />
          ) : null}
          <div>
            <h1 className="text-xl font-bold">
              {account.name}
              {isClient && <span className="ml-2 align-middle rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">顧客向け</span>}
            </h1>
            <p className="text-sm text-slate-500">メーカー別レポート ・ {rp.label} ・ 販売単位 {units.length} 件</p>
          </div>
        </div>
        <div className="print:hidden flex items-center gap-2 flex-wrap">
          {/* 出力対象の出し分け（社内向け=広告等の内部指標込み / 顧客向け=非表示） */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
            <Link
              href={`/reports/brands/${accountId}?${query}`}
              className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${!isClient ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-200"}`}
            >
              社内向け
            </Link>
            <Link
              href={`/reports/brands/${accountId}?${query}&audience=client`}
              className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${isClient ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-200"}`}
            >
              顧客向け
            </Link>
          </div>
          <ReportRangePicker kind={rp.kind} date={ymdUtc(rp.start)} from={sp.from} to={sp.to} />
          <a href={`/reports/brands/${accountId}/csv?${viewQuery}`} className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            CSV出力
          </a>
          <PrintButton />
        </div>
      </div>

      {/* ヒーロー */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className={`${isClient ? "lg:col-span-3" : "lg:col-span-2"} rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5`}>
          <div className="text-xs text-emerald-700 font-medium">コンテンツ経由の売上（動画＋ライブ）</div>
          <div className="mt-1 flex items-end gap-3">
            <span className="text-4xl font-bold text-emerald-700 tracking-tight">{curContentGmv == null ? "—" : formatYen(curContentGmv)}</span>
            <span className="mb-1.5">
              <TrendBadge deltaPct={trendPct(curContentGmv, prevContentGmv)} deltaAbs={signedYen(curContentGmv, prevContentGmv)} suffix={`vs ${prevWord}`} />
            </span>
          </div>
          <div className="mt-4"><CompositionBar video={cur.videoGmv ?? 0} live={cur.liveGmv ?? 0} /></div>
        </div>
        {!isClient && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="text-xs text-slate-500 font-medium mb-3">広告パフォーマンス</div>
            <dl className="space-y-3">
              <MiniRow label="広告経由GMV" value={cur.adGmv == null ? "—" : formatYen(cur.adGmv)} delta={trendPct(cur.adGmv, previous.adGmv)} deltaAbs={signedYen(cur.adGmv, previous.adGmv)} />
              <MiniRow label="ROI" value={pct(curRoi)} delta={trendPct(curRoi, prevRoi)} />
              <MiniRow label="広告費" value={cur.adSpend == null ? "—" : formatYen(cur.adSpend)} delta={trendPct(cur.adSpend, previous.adSpend)} deltaAbs={signedYen(cur.adSpend, previous.adSpend)} invert />
              <MiniRow label="日予算消化率" value={pct(curRate)} delta={trendPct(curRate, prevRate)} invert />
            </dl>
          </div>
        )}
      </div>

      {/* サマリー（自動示唆＋手動メモ） */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          {summaryTitle}
          <span className="ml-2 text-xs font-normal text-slate-400">（{prevWord}比較・数値から自動生成）</span>
        </h2>
        <SummaryEditor insights={insights} scope="account" refId={accountId} periodKey={pKey} initialNote={note} prevWord={prevWord} />
      </section>

      {/* KPIタイル */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile label="動画経由GMV" value={cur.videoGmv == null ? "—" : formatYen(cur.videoGmv)} deltaPct={trendPct(cur.videoGmv, previous.videoGmv)} />
        <StatTile label="ライブ経由GMV" value={cur.liveGmv == null ? "—" : formatYen(cur.liveGmv)} deltaPct={trendPct(cur.liveGmv, previous.liveGmv)} />
        <StatTile label="動画投稿数" value={nz(cur.videoPosts)} deltaPct={trendPct(cur.videoPosts, previous.videoPosts)} />
        <StatTile label="ライブ実施回数" value={nz(cur.liveCount)} deltaPct={trendPct(cur.liveCount, previous.liveCount)} />
        <StatTile label="注文数" value={nz(cur.orderCount)} deltaPct={trendPct(cur.orderCount, previous.orderCount)} />
        {!isClient && <StatTile label="CPA" value={curCpa == null ? "—" : formatYen(curCpa)} deltaPct={trendPct(curCpa, prevCpa)} invert />}
        <StatTile label="配送 売上個数" value={nz(cur.shippingQty)} deltaPct={trendPct(cur.shippingQty, previous.shippingQty)} />
        <StatTile label="配送 売上金額" value={cur.shippingAmount == null ? "—" : formatYen(cur.shippingAmount)} deltaPct={trendPct(cur.shippingAmount, previous.shippingAmount)} />
      </div>

      {/* 販売単位別 内訳 */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">販売単位別 コンテンツ売上</h2>
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {perUnitRanked.length === 0 && <p className="py-6 text-center text-sm text-slate-400">販売単位がありません。</p>}
          {perUnitRanked.map(({ u, contentGmv, video }) => {
            const w = Math.round((contentGmv / maxContentGmv) * 100);
            const videoW = contentGmv > 0 ? Math.round((video / contentGmv) * w) : 0;
            return (
              <Link key={u.id} href={`/reports/daily/${u.id}?${query}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <div className="w-40 shrink-0 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{u.productSku ?? unitBrandLabel(u)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-5 w-full rounded bg-slate-100 overflow-hidden flex">
                    <div className="h-full" style={{ width: `${videoW}%`, backgroundColor: CH.video }} />
                    <div className="h-full" style={{ width: `${w - videoW}%`, backgroundColor: CH.live }} />
                  </div>
                </div>
                <div className="w-28 shrink-0 text-right text-sm font-semibold text-slate-800 tabular-nums">{formatYen(contentGmv)}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 推移グラフ（PDF/印刷にも出力） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <ChartCard title={`チャネル別売上（動画/ライブ）推移 ・ ${trendSuffix}`}>
          {hasChannelGmv ? <ChannelGmvChart data={channelGmvChartData} /> : <Empty note="動画/ライブGMVは案件進捗管理から日次で入力してください" />}
        </ChartCard>
        <ChartCard title={`クリエイティブ活動 推移 ・ ${trendSuffix}`}>
          {allReports.length === 0 ? <Empty /> : <CreativeChart data={creativeChartData} />}
        </ChartCard>
        {!isClient && (
          <>
            <ChartCard title={`広告費 と 広告経由GMV ・ ${trendSuffix}`}>
              {hasAdData ? <AdCompareChart data={adChartData} /> : <Empty note="広告実績は案件進捗管理から入力してください" />}
            </ChartCard>
            <ChartCard title={`ROI 推移 ・ ${trendSuffix}`}>
              {hasAdData ? <RoiTrendChart data={roiChartData} /> : <Empty note="広告実績は案件進捗管理から入力してください" />}
            </ChartCard>
          </>
        )}
      </div>
    </div>
  );
}

function MiniRow({ label, value, delta, invert, deltaAbs }: { label: string; value: string; delta: number | null; invert?: boolean; deltaAbs?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="flex items-center gap-2">
        <span className="text-sm font-bold text-slate-800 tabular-nums">{value}</span>
        <TrendBadge deltaPct={delta} invert={invert} deltaAbs={deltaAbs} />
      </dd>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="avoid-break">
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
