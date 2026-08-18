import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatYen } from "@/lib/enums";
import { createSalesUnit } from "@/lib/actions/salesUnits";
import { SubmitButton } from "@/components/SubmitButton";
import { AccountProductPicker } from "@/components/AccountProductPicker";
import { Sparkline } from "@/components/Sparkline";
import { rollupWeeks, weekSales, weekGmv, type WeekRollup } from "@/lib/progress";

export const dynamic = "force-dynamic";

type UnitLike = { status: string; weeklyTarget: number | null; dailyReports: { reportDate: Date; videoSales: number | null; liveSales: number | null; videoGmv: number | null; liveGmv: number | null; videoPosts: number | null; liveCount: number | null }[] };

/** 販売単位群を顧客レベルで集計（直近週の販売・GMV・達成率・推移） */
function summarize(units: UnitLike[]) {
  const active = units.filter((u) => u.status === "稼働中");
  const allDaily = units.flatMap((u) => u.dailyReports);
  const weeks: WeekRollup[] = rollupWeeks(allDaily);
  const latest = weeks[weeks.length - 1] ?? null;
  const sales = latest ? weekSales(latest) : 0;
  const gmv = latest ? weekGmv(latest) : 0;
  const target = units.reduce((s, u) => s + (u.weeklyTarget ?? 0), 0);
  const ach = target > 0 ? Math.round((sales / target) * 100) : null;
  const trend = weeks.map((w) => weekSales(w));
  return { activeCount: active.length, unitCount: units.length, sales, gmv, target, ach, trend };
}

export default async function ProgressPage() {
  const [accounts, unassigned, pickerAccounts] = await Promise.all([
    prisma.account.findMany({
      where: { salesUnits: { some: {} } },
      include: { salesUnits: { include: { dailyReports: { orderBy: { reportDate: "asc" } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.salesUnit.findMany({
      where: { accountId: null },
      include: { dailyReports: { orderBy: { reportDate: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.account.findMany({
      select: { id: true, name: true, products: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = accounts
    .map((a) => ({ a, s: summarize(a.salesUnits as UnitLike[]) }))
    .sort((x, y) => y.s.gmv - x.s.gmv);

  const unassignedSummary = summarize(unassigned as UnitLike[]);

  // 全体KPI
  const totalActive = rows.reduce((s, r) => s + r.s.activeCount, 0) + unassignedSummary.activeCount;
  const totalLatestGmv = rows.reduce((s, r) => s + r.s.gmv, 0) + unassignedSummary.gmv;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ツールバー */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h1 className="text-lg font-bold">案件進捗管理</h1>
        <Link
          href="/progress/import"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ⬆ CSV取込
        </Link>
      </div>

      {/* サマリKPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 border-y border-slate-200">
        <Kpi label="顧客（メーカー）" value={`${rows.length} 社`} accent />
        <Kpi label="稼働中の販売単位" value={`${totalActive} 件`} />
        <Kpi label="直近週GMV（全社）" value={formatYen(totalLatestGmv)} />
        <Kpi label="顧客未設定" value={`${unassigned.length} 件`} danger={unassigned.length > 0} />
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-2">
        {rows.length === 0 && unassigned.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-10">
            販売単位がありません。下のフォームから追加してください。
          </p>
        )}

        {/* 顧客カード */}
        {rows.map(({ a, s }) => (
          <Link
            key={a.id}
            href={`/progress/accounts/${a.id}`}
            className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-emerald-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3 w-64 shrink-0 min-w-0">
              {a.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.logoUrl} alt={a.name} className="h-9 w-9 rounded object-contain border border-slate-200 bg-white shrink-0" />
              ) : (
                <div className="h-9 w-9 rounded bg-slate-100 flex items-center justify-center text-slate-400 text-sm font-bold shrink-0">
                  {a.name.slice(0, 1)}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold truncate">{a.name}</div>
                <div className="text-[11px] text-slate-400">
                  販売単位 {s.unitCount} 件{s.activeCount < s.unitCount ? `（稼働 ${s.activeCount}）` : ""}
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="text-xs text-slate-400">直近週</span>
                <span className="font-bold tabular-nums">{s.sales}</span>
                <span className="text-slate-400 text-xs">/ 目標 {s.target || "—"}</span>
                {s.ach != null && (
                  <span className={`text-xs font-medium ${s.ach >= 100 ? "text-emerald-600" : "text-slate-500"}`}>{s.ach}%</span>
                )}
              </div>
              <div className="mt-1 h-1.5 w-full max-w-xs rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${s.ach != null && s.ach >= 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                  style={{ width: `${Math.min(100, s.ach ?? 0)}%` }}
                />
              </div>
            </div>

            <div className="hidden md:block shrink-0">
              <Sparkline values={s.trend} />
              <div className="text-[10px] text-slate-400 text-center mt-0.5">販売推移</div>
            </div>

            <div className="hidden lg:block w-24 text-right shrink-0">
              <div className="text-[10px] text-slate-400">直近週GMV</div>
              <div className="text-sm font-medium text-slate-700 tabular-nums">{formatYen(s.gmv)}</div>
            </div>
          </Link>
        ))}

        {/* 未分類（顧客未設定） */}
        {unassigned.length > 0 && (
          <Link
            href="/progress/accounts/unassigned"
            className="flex items-center gap-4 rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 hover:border-amber-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3 w-64 shrink-0 min-w-0">
              <div className="h-9 w-9 rounded bg-amber-100 flex items-center justify-center text-amber-600 text-sm font-bold shrink-0">?</div>
              <div className="min-w-0">
                <div className="font-semibold truncate text-amber-800">未分類（顧客未設定）</div>
                <div className="text-[11px] text-amber-600">販売単位 {unassigned.length} 件 ・ 顧客を割り当ててください</div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-500">直近週 販売 <span className="font-bold tabular-nums text-slate-700">{unassignedSummary.sales}</span></div>
            </div>
            <div className="hidden md:block shrink-0">
              <Sparkline values={unassignedSummary.trend} color="#eda100" />
            </div>
            <div className="hidden lg:block w-24 text-right shrink-0">
              <div className="text-[10px] text-slate-400">直近週GMV</div>
              <div className="text-sm font-medium text-slate-700 tabular-nums">{formatYen(unassignedSummary.gmv)}</div>
            </div>
          </Link>
        )}
      </div>

      {/* 追加フォーム */}
      <form
        action={createSalesUnit}
        className="flex flex-wrap items-end gap-2 px-6 py-3 border-t border-slate-200 bg-white"
      >
        <span className="text-sm font-medium text-slate-600 mr-1">販売単位を追加:</span>
        <AccountProductPicker accounts={pickerAccounts} />
        <Inp name="brand" label="ブランド *" required w="w-32" />
        <Inp name="productSku" label="商品名/SKU（自由入力）" w="w-40" />
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

function Kpi({ label, value, accent, danger }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  return (
    <div className={`px-5 py-3 ${danger ? "bg-rose-50" : accent ? "bg-emerald-50" : "bg-white"}`}>
      <div className={`text-xs ${danger ? "text-rose-500" : "text-slate-500"}`}>{label}</div>
      <div className={`text-lg font-bold tabular-nums ${danger ? "text-rose-700" : accent ? "text-emerald-700" : "text-slate-800"}`}>{value}</div>
    </div>
  );
}

function Inp({ name, label, type = "text", required, w = "w-24" }: { name: string; label: string; type?: string; required?: boolean; w?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-slate-500">{label}</span>
      <input name={name} type={type} required={required} className={`rounded-md border border-slate-300 px-2 py-1.5 text-sm ${w}`} />
    </label>
  );
}
