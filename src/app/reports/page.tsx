import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatYen } from "@/lib/enums";
import {
  resolvePeriod,
  previousPeriod,
  sumReports,
  contentGmvTotal,
  roi,
  trendPct,
} from "@/lib/reports";
import { StatTile } from "@/components/StatTile";
import { TrendBadge } from "@/components/TrendBadge";

export const dynamic = "force-dynamic";

const REPORT_TYPES = [
  {
    href: "/reports/daily",
    icon: "📈",
    title: "日次進捗報告",
    tagline: "クリエイティブ・広告・売上を横断",
    description:
      "動画/ライブの実績、広告（費用・GMV・ROI・CPA・消化率）、売上（販売数・売上金額）を集計。日次/週次(金〜木)/月次/任意期間で切替、PDF・CSV出力に対応。",
    accent: "emerald",
  },
  {
    href: "/reports/brands",
    icon: "🏭",
    title: "メーカー別レポート",
    tagline: "顧客ごとに合算・提出フォーマット",
    description:
      "顧客（メーカー）単位で販売単位を合算。コンテンツ売上・広告実績・週次推移を表示し、社内向け/顧客向けを切替えてPDF・CSV出力できます。",
    accent: "blue",
  },
  {
    href: "/reports/import",
    icon: "⬆️",
    title: "CSVインポート",
    tagline: "セラーセンターの実績を一括反映",
    description:
      "商品別CSVを読み込み、日次実績へまとめて反映。手入力を削減します（販売単位ごとの取り込みは案件進捗管理からも可能）。",
    accent: "violet",
  },
] as const;

const ACCENT: Record<string, { icon: string; hover: string; arrow: string }> = {
  emerald: { icon: "bg-emerald-100 text-emerald-700", hover: "hover:border-emerald-300", arrow: "text-emerald-600" },
  blue: { icon: "bg-blue-100 text-blue-700", hover: "hover:border-blue-300", arrow: "text-blue-600" },
  violet: { icon: "bg-violet-100 text-violet-700", hover: "hover:border-violet-300", arrow: "text-violet-600" },
};

const DR_FIELDS = { reportDate: true, videoGmv: true, liveGmv: true, adSpend: true, adGmv: true, orderCount: true, shippingQty: true } as const;

async function loadWeekOverview() {
  const rp = resolvePeriod({ period: "week" });
  const prev = previousPeriod(rp);
  const units = await prisma.salesUnit.findMany({
    where: { status: "稼働中" },
    select: { dailyReports: { where: { reportDate: { gte: prev.start, lt: rp.end } }, select: DR_FIELDS } },
  });
  const all = units.flatMap((u) => u.dailyReports);
  const cur = sumReports(all.filter((r) => r.reportDate >= rp.start && r.reportDate < rp.end));
  const pv = sumReports(all.filter((r) => r.reportDate >= prev.start && r.reportDate < prev.end));
  return {
    label: rp.label,
    hasData: all.length > 0,
    activeUnits: units.length,
    curContentGmv: contentGmvTotal(cur) ?? 0,
    prevContentGmv: contentGmvTotal(pv) ?? 0,
    cur,
    pv,
    curRoi: roi(cur),
    prevRoi: roi(pv),
  };
}

export default async function ReportsPage() {
  const o = await loadWeekOverview();

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl shadow-sm">📊</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">レポート</h1>
            <p className="text-sm text-slate-500">実績を集計し、顧客向け・内部向けに出力できます。</p>
          </div>
        </div>
        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
          今週: <span className="font-medium text-slate-700">{o.label}</span>
        </div>
      </div>

      {/* 今週のハイライト */}
      <section className="mb-9">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            今週のハイライト
            <span className="ml-2 text-xs font-normal text-slate-400">稼働中の販売単位 {o.activeUnits} 件・先週比</span>
          </h2>
          <Link href="/reports/daily" className="text-xs font-medium text-emerald-600 hover:underline">
            日次進捗報告を開く →
          </Link>
        </div>

        {o.hasData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* ヒーロー: コンテンツ経由売上 */}
            <div className="lg:col-span-1 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 flex flex-col justify-between">
              <div className="text-xs font-medium text-emerald-700">コンテンツ経由の売上</div>
              <div className="mt-2">
                <div className="text-4xl font-bold tracking-tight text-emerald-700 tabular-nums">{formatYen(o.curContentGmv)}</div>
                <div className="mt-2">
                  <TrendBadge deltaPct={trendPct(o.curContentGmv, o.prevContentGmv)} suffix="vs 先週" />
                </div>
              </div>
            </div>

            {/* サブ指標 */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile label="広告費" value={formatYen(o.cur.adSpend ?? 0)} deltaPct={trendPct(o.cur.adSpend, o.pv.adSpend)} invert />
              <StatTile label="広告経由GMV" value={formatYen(o.cur.adGmv ?? 0)} deltaPct={trendPct(o.cur.adGmv, o.pv.adGmv)} />
              <StatTile label="ROI" value={o.curRoi == null ? "—" : `${o.curRoi}%`} deltaPct={trendPct(o.curRoi, o.prevRoi)} />
              <StatTile label="注文数" value={(o.cur.orderCount ?? 0).toLocaleString("ja-JP")} deltaPct={trendPct(o.cur.orderCount, o.pv.orderCount)} />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center">
            <div className="text-3xl mb-2">🗓️</div>
            <p className="text-sm font-medium text-slate-600">今週の実績はまだありません</p>
            <p className="mt-1 text-xs text-slate-500">案件進捗管理から日次実績を入力するか、CSVで取り込むとここに集計が表示されます。</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Link href="/progress" className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                案件進捗管理へ
              </Link>
              <Link href="/reports/import" className="rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                CSVで取り込む
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* レポートを開く */}
      <h2 className="text-sm font-semibold text-slate-700 mb-3">レポートを開く</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((r) => {
          const a = ACCENT[r.accent];
          return (
            <Link
              key={r.title}
              href={r.href}
              className={`group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${a.hover}`}
            >
              <div className="flex items-start gap-3">
                <div className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-xl ${a.icon}`}>{r.icon}</div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 leading-tight">{r.title}</h3>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">{r.tagline}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed flex-1">{r.description}</p>
              <div className={`mt-4 flex items-center text-xs font-semibold ${a.arrow}`}>
                開く
                <span className="ml-1 transition-transform group-hover:translate-x-0.5">→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
