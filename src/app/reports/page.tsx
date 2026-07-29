import Link from "next/link";

export const dynamic = "force-dynamic";

const REPORT_TYPES = [
  {
    href: "/reports/daily",
    title: "日次進捗報告",
    description:
      "クリエイティブ（動画投稿数・ライブ実施回数）、広告（広告費・GMV・ROI・注文数・CPA・日予算消化率）、配送依頼（売上個数・売上金額）を集計。日次/週次(金〜木)/月次/任意期間で切替でき、顧客向け・内部向けに印刷/PDF出力できます。",
    enabled: true,
  },
  {
    href: "/reports/brands",
    title: "メーカー別レポート",
    description:
      "顧客（メーカー）ごとに販売単位を合算したレポート。顧客単位のコンテンツ売上・広告実績・推移を表示し、PDF印刷・CSVで出力できます。",
    enabled: true,
  },
  {
    href: "/reports/import",
    title: "CSVインポート",
    description:
      "Seller Centerの商品別CSVを読み込み、日次実績に自動反映します。手入力の負荷を軽減。※列マッピングは暫定（要件定義で確定予定）。",
    enabled: true,
  },
] as const;

export default function ReportsPage() {
  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-xl font-bold mb-1">レポート</h1>
      <p className="text-sm text-slate-500 mb-6">
        必要な指標を集計し、顧客向け・内部向けに出力できるレポート機能です。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((r) =>
          r.enabled ? (
            <Link
              key={r.title}
              href={r.href}
              className="rounded-lg border border-slate-200 bg-white p-4 hover:border-emerald-300 hover:shadow-sm transition-all"
            >
              <h2 className="font-semibold text-slate-800 mb-1">{r.title}</h2>
              <p className="text-xs text-slate-500 leading-relaxed">{r.description}</p>
            </Link>
          ) : (
            <div
              key={r.title}
              className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 opacity-60 cursor-not-allowed"
            >
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold text-slate-500">{r.title}</h2>
                <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">
                  準備中
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{r.description}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
