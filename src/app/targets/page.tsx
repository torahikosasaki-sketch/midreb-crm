import { prisma } from "@/lib/prisma";
import { formatYen, linesMrr, POST_CONTRACT_PHASES } from "@/lib/enums";
import { createTarget, deleteTarget } from "@/lib/actions/targets";

export const dynamic = "force-dynamic";

function Bar({
  label,
  actual,
  target,
  fmt = (n: number) => n.toLocaleString("ja-JP"),
}: {
  label: string;
  actual: number;
  target: number | null;
  fmt?: (n: number) => string;
}) {
  const pct = target && target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : null;
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="tabular-nums">
          <span className="font-semibold text-slate-800">{fmt(actual)}</span>
          <span className="text-slate-400"> / {target != null ? fmt(target) : "—"}</span>
          {pct != null && <span className="ml-1 text-emerald-600">({pct}%)</span>}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${
            pct != null && pct >= 100 ? "bg-emerald-500" : "bg-emerald-500"
          }`}
          style={{ width: `${pct ?? 0}%` }}
        />
      </div>
    </div>
  );
}

export default async function TargetsPage() {
  const [targets, contractedDeals, weekly] = await Promise.all([
    prisma.target.findMany({ orderBy: { label: "asc" } }),
    prisma.deal.findMany({
      where: { phase: { in: POST_CONTRACT_PHASES as string[] } },
      select: { accountId: true, lineItems: true },
    }),
    prisma.weeklyProgress.findMany({ select: { videoPosts: true, videoPosters: true } }),
  ]);

  // 実績（現時点）: 月間GMV=現MRR、セラー数=契約中の顧客数
  const gmvActual = contractedDeals.reduce((s, d) => s + linesMrr(d.lineItems), 0);
  const sellerActual = new Set(contractedDeals.map((d) => d.accountId).filter(Boolean)).size;
  // 案件進捗（週次）から: クリエイター数≈動画投稿人数の延べ、制作本数≈動画投稿数の延べ
  const creatorActual = weekly.reduce((s, w) => s + (w.videoPosters ?? 0), 0);
  const productionActual = weekly.reduce((s, w) => s + (w.videoPosts ?? 0), 0);

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold mb-1">目標 vs 実績</h1>
      <p className="text-xs text-slate-400 mb-5">
        実績は現時点の集計（月間GMV=現MRR／セラー数=契約中の顧客数／クリエイター数=案件進捗の動画投稿人数合計／制作本数=案件進捗の動画投稿数合計）。
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "月間GMV（運用中）", value: formatYen(gmvActual) },
          { label: "セラー数（運用中）", value: sellerActual.toLocaleString("ja-JP") },
          { label: "クリエイター数", value: creatorActual.toLocaleString("ja-JP") },
          { label: "制作本数", value: productionActual.toLocaleString("ja-JP") },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className="text-lg font-bold text-slate-800 tabular-nums">{c.value}</div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-slate-700 mb-2">フェーズ計画との対比</h2>
      <div className="space-y-4 mb-8">
        {targets.length === 0 && (
          <p className="text-sm text-slate-400">目標が未登録です。下のフォームから追加してください。</p>
        )}
        {targets.map((t) => (
          <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{t.label}</h3>
              <form action={deleteTarget.bind(null, t.id)}>
                <button type="submit" className="text-xs text-slate-400 hover:text-rose-600">
                  削除
                </button>
              </form>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              <Bar label="月間GMV" actual={gmvActual} target={t.monthlyGmvTarget} fmt={formatYen} />
              <Bar label="セラー数" actual={sellerActual} target={t.sellerTarget} />
              <Bar label="クリエイター数" actual={creatorActual} target={t.creatorTarget} />
              <Bar label="制作本数" actual={productionActual} target={t.productionTarget} />
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-slate-700 mb-2">目標を追加</h2>
      <form
        action={createTarget}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3"
      >
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-500">フェーズ/期間 *</span>
          <input name="label" required placeholder="例: フェーズ2 (2026 Q3)" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm w-44" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-500">月間GMV目標</span>
          <input name="monthlyGmvTarget" type="number" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm w-32" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-500">セラー数</span>
          <input name="sellerTarget" type="number" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm w-20" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-500">クリエイター数</span>
          <input name="creatorTarget" type="number" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm w-20" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-slate-500">制作本数</span>
          <input name="productionTarget" type="number" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm w-20" />
        </label>
        <button type="submit" className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
          ＋ 追加
        </button>
      </form>
    </div>
  );
}
