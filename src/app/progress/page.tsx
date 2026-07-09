import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatYen } from "@/lib/enums";
import { createSalesUnit } from "@/lib/actions/salesUnits";
import { SubmitButton } from "@/components/SubmitButton";
import {
  weekSales,
  weekGmv,
  weekGap,
  weekAchievement,
  effectiveTarget,
  weekLabel,
} from "@/lib/progress";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const units = await prisma.salesUnit.findMany({
    include: { weeks: { orderBy: { weekStart: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  const rows = units.map((u) => {
    const weeks = u.weeks;
    const latest = weeks[weeks.length - 1] ?? null;
    const sales = latest ? weekSales(latest) : 0;
    const gmv = latest ? weekGmv(latest) : 0;
    const target = latest ? effectiveTarget(latest, u.weeklyTarget) : u.weeklyTarget ?? null;
    const gap = latest ? weekGap(latest, u.weeklyTarget) : null;
    const ach = latest ? weekAchievement(latest, u.weeklyTarget) : null;
    const trend = weeks.map((w) => weekSales(w));
    return { u, weeks, latest, sales, gmv, target, gap, ach, trend };
  });

  // 稼働中を優先し、未達（gapが小さい順）を上に
  const sorted = [...rows].sort((a, b) => {
    const aEnd = a.u.status === "終了" ? 1 : 0;
    const bEnd = b.u.status === "終了" ? 1 : 0;
    if (aEnd !== bEnd) return aEnd - bEnd;
    return (a.gap ?? 1e12) - (b.gap ?? 1e12);
  });

  const active = rows.filter((r) => r.u.status === "稼働中");
  const latestGmv = active.reduce((s, r) => s + r.gmv, 0);
  const behind = active.filter((r) => r.gap != null && r.gap < 0).length;
  const totSales = active.reduce((s, r) => s + r.sales, 0);
  const totTarget = active.reduce((s, r) => s + (r.target ?? 0), 0);
  const overallAch = totTarget > 0 ? Math.round((totSales / totTarget) * 100) : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* サマリKPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 border-b border-slate-200">
        <Kpi label="稼働中の販売単位" value={`${active.length} 件`} accent />
        <Kpi label="直近週GMV" value={formatYen(latestGmv)} />
        <Kpi label="直近週 達成率" value={overallAch == null ? "—" : `${overallAch}%`} />
        <Kpi label="目標未達" value={`${behind} 件`} danger={behind > 0} />
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-2">
        {sorted.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-10">
            販売単位がありません。下のフォームから追加してください。
          </p>
        )}
        {sorted.map(({ u, latest, sales, gmv, target, gap, ach, trend }) => (
          <Link
            key={u.id}
            href={`/progress/${u.id}`}
            className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-emerald-300 hover:shadow-sm transition-all"
          >
            {/* 販売単位 */}
            <div className="w-56 shrink-0 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{u.productSku ?? u.brand}</span>
                {u.status === "終了" && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">終了</span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                {u.brand}
                {u.store ? ` ・ ${u.store}` : ""}
              </div>
            </div>

            {/* 達成状況 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="text-xs text-slate-400">直近週</span>
                <span className="font-bold tabular-nums">{sales}</span>
                <span className="text-slate-400 text-xs">/ 目標 {target ?? "—"}</span>
                {ach != null && (
                  <span className={`text-xs font-medium ${ach >= 100 ? "text-emerald-600" : "text-slate-500"}`}>
                    {ach}%
                  </span>
                )}
                {gap != null && (
                  <span className={`text-xs font-medium ${gap < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {gap >= 0 ? `+${gap}` : gap}
                  </span>
                )}
              </div>
              <div className="mt-1 h-1.5 w-full max-w-xs rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${ach != null && ach >= 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.min(100, ach ?? 0)}%` }}
                />
              </div>
              {latest && (
                <div className="mt-0.5 text-[10px] text-slate-400 truncate">
                  {weekLabel(latest.weekStart)}
                  {latest.activityNote ? ` ・ ${latest.activityNote}` : ""}
                </div>
              )}
            </div>

            {/* トレンド */}
            <div className="hidden md:block shrink-0">
              <Sparkline values={trend} />
              <div className="text-[10px] text-slate-400 text-center mt-0.5">販売推移</div>
            </div>

            {/* 直近GMV */}
            <div className="hidden lg:block w-24 text-right shrink-0">
              <div className="text-[10px] text-slate-400">直近週GMV</div>
              <div className="text-sm font-medium text-slate-700 tabular-nums">{formatYen(gmv)}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* 追加フォーム */}
      <form
        action={createSalesUnit}
        className="flex flex-wrap items-end gap-2 px-6 py-3 border-t border-slate-200 bg-white"
      >
        <span className="text-sm font-medium text-slate-600 mr-1">販売単位を追加:</span>
        <Inp name="brand" label="ブランド *" required w="w-32" />
        <Inp name="productSku" label="商品名/SKU" w="w-40" />
        <Inp name="store" label="ストア" w="w-24" />
        <Inp name="weeklyTarget" label="週次目標" type="number" w="w-24" />
        <SubmitButton
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          pendingLabel="追加中…"
        >
          ＋ 追加
        </SubmitButton>
      </form>
    </div>
  );
}

/** インラインSVGスパークライン（販売数推移） */
function Sparkline({ values }: { values: number[] }) {
  const w = 96;
  const h = 28;
  if (values.length === 0) return <div style={{ width: w, height: h }} />;
  const max = Math.max(1, ...values);
  const n = values.length;
  const step = n > 1 ? w / (n - 1) : 0;
  const pts = values.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`).join(" ");
  const last = values[n - 1];
  const lastX = (n - 1) * step;
  const lastY = h - (last / max) * (h - 4) - 2;
  return (
    <svg width={w} height={h} className="overflow-visible">
      {n > 1 && <polyline points={pts} fill="none" stroke="#10b981" strokeWidth="1.5" />}
      <circle cx={lastX} cy={lastY} r="2.5" fill="#059669" />
    </svg>
  );
}

function Kpi({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className={`px-5 py-3 ${danger ? "bg-rose-50" : accent ? "bg-emerald-50" : "bg-white"}`}>
      <div className={`text-xs ${danger ? "text-rose-500" : "text-slate-500"}`}>{label}</div>
      <div
        className={`text-lg font-bold tabular-nums ${
          danger ? "text-rose-700" : accent ? "text-emerald-700" : "text-slate-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Inp({
  name,
  label,
  type = "text",
  required,
  w = "w-24",
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  w?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-slate-500">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className={`rounded-md border border-slate-300 px-2 py-1.5 text-sm ${w}`}
      />
    </label>
  );
}
