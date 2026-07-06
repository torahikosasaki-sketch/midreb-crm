import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  weightedRevenue,
  formatYen,
  BUSINESS_TYPES,
  ACTIVE_PHASES,
  PHASE_COLORS,
  type Phase,
} from "@/lib/enums";
import {
  PhaseFunnel,
  BizPie,
  MonthlyBars,
  OwnerBars,
} from "@/components/DashboardCharts";

export const dynamic = "force-dynamic";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function monthKey(d: Date | null): string {
  if (!d) return "未定";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const [deals, accountCount, target] = await Promise.all([
    prisma.deal.findMany({ include: { account: { select: { name: true } } } }),
    prisma.account.count(),
    prisma.target.findFirst({ orderBy: { label: "asc" } }),
  ]);

  const isActive = (p: string) => p !== "失注" && p !== "保留";
  const active = deals.filter((d) => isActive(d.phase));
  const w = (d: { expectedRevenue: number; probability: number }) =>
    weightedRevenue(d.expectedRevenue, d.probability);

  // KPI
  const pipelineWeighted = active.reduce((s, d) => s + w(d), 0);
  const expectedTotal = active.reduce((s, d) => s + d.expectedRevenue, 0);
  const runningGmv = deals
    .filter((d) => d.phase === "運用中")
    .reduce((s, d) => s + d.expectedRevenue, 0);
  const today = startOfToday();
  const overdue = active.filter(
    (d) => d.nextActionDate && d.nextActionDate < today
  ).length;
  const wonCount = deals.filter((d) => d.phase === "契約" || d.phase === "運用中").length;

  // フェーズ別ファネル
  const phaseData = ACTIVE_PHASES.map((p) => {
    const rows = deals.filter((d) => d.phase === p);
    return {
      phase: p,
      count: rows.length,
      weighted: rows.reduce((s, d) => s + w(d), 0),
    };
  });

  // 事業区分別
  const bizData = BUSINESS_TYPES.map((b) => ({
    name: b,
    value: active.filter((d) => d.businessType === b).reduce((s, d) => s + w(d), 0),
  }));

  // 月次見込み
  const monthMap = new Map<string, number>();
  for (const d of active) {
    const k = monthKey(d.expectedCloseDate);
    monthMap.set(k, (monthMap.get(k) ?? 0) + w(d));
  }
  const monthData = [...monthMap.entries()]
    .sort((a, b) => (a[0] === "未定" ? 1 : b[0] === "未定" ? -1 : a[0].localeCompare(b[0])))
    .map(([month, weighted]) => ({ month, weighted }));

  // 担当者別（上位8）
  const ownerMap = new Map<string, number>();
  for (const d of active) {
    const o = d.owner ?? "未割当";
    ownerMap.set(o, (ownerMap.get(o) ?? 0) + w(d));
  }
  const ownerData = [...ownerMap.entries()]
    .map(([owner, weighted]) => ({ owner, weighted }))
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 8);

  // 目標達成率（フェーズ1のGMV目標 vs 運用中GMV）
  const gmvTarget = target?.monthlyGmvTarget ?? null;
  const gmvPct = gmvTarget ? Math.min(100, Math.round((runningGmv / gmvTarget) * 100)) : null;

  // 直近の要対応（次回アクション昇順 上位6）
  const upcoming = active
    .filter((d) => d.nextActionDate)
    .sort((a, b) => a.nextActionDate!.getTime() - b.nextActionDate!.getTime())
    .slice(0, 6);

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-baseline justify-between mb-5">
        <h1 className="text-xl font-bold">ダッシュボード</h1>
        <span className="text-xs text-slate-400">失注・保留を除く進行中商談ベース</span>
      </div>

      {/* KPI カード */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <Kpi label="パイプライン加重売上" value={formatYen(pipelineWeighted)} accent />
        <Kpi label="想定売上合計" value={formatYen(expectedTotal)} />
        <Kpi label="進行中商談" value={`${active.length} 件`} />
        <Kpi label="運用中GMV(月間)" value={formatYen(runningGmv)} />
        <Kpi label="受注/運用中" value={`${wonCount} 件`} />
        <Kpi label="アクション遅延" value={`${overdue} 件`} danger={overdue > 0} />
      </div>

      {/* チャートグリッド */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="フェーズ別 加重売上（ファネル）">
          <PhaseFunnel data={phaseData} />
        </Card>
        <Card title="事業区分別 加重売上 構成比">
          <BizPie data={bizData} />
        </Card>
        <Card title="月次見込み（受注予定日別 加重売上）" href="/pipeline" linkLabel="月次集計の詳細 →">
          <MonthlyBars data={monthData} />
        </Card>
        <Card title="担当者別 加重売上（上位8）">
          <OwnerBars data={ownerData} />
        </Card>
      </div>

      {/* 下段: 目標達成・要対応 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="目標達成率（運用中GMV）" href="/targets" linkLabel="目標 vs 実績の詳細 →">
          {gmvTarget ? (
            <div>
              <div className="flex items-baseline justify-between text-sm mb-1">
                <span className="text-slate-500">{target?.label}</span>
                <span className="tabular-nums">
                  <span className="font-bold text-slate-800">{formatYen(runningGmv)}</span>
                  <span className="text-slate-400"> / {formatYen(gmvTarget)}</span>
                  <span className="ml-1 text-emerald-600">({gmvPct}%)</span>
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${gmvPct! >= 100 ? "bg-emerald-500" : "bg-emerald-500"}`}
                  style={{ width: `${gmvPct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">目標が未設定です</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Mini label="顧客企業" value={`${accountCount} 社`} />
            <Mini label="進行中商談" value={`${active.length} 件`} />
          </div>
        </Card>

        <Card title="直近の要対応（次回アクション）">
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400">予定なし</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcoming.map((d) => {
                const overdueRow = d.nextActionDate! < today;
                return (
                  <Link
                    key={d.id}
                    href={`/deals/${d.id}`}
                    className="flex items-center gap-2 py-2 text-sm hover:bg-slate-50 -mx-2 px-2 rounded"
                  >
                    <span className={`h-2 w-2 rounded-full ${PHASE_COLORS[d.phase as Phase] ?? "bg-slate-300"}`} />
                    <span className="truncate flex-1">{d.account?.name ?? "(未設定)"}</span>
                    <span className="text-xs text-slate-400">{d.owner ?? "—"}</span>
                    <span className={`text-xs ${overdueRow ? "text-rose-600 font-medium" : "text-slate-400"}`}>
                      {d.nextActionDate!.toISOString().slice(5, 10).replace("-", "/")}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
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
    <div
      className={`rounded-lg border p-3 ${
        danger ? "border-rose-200 bg-rose-50" : accent ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
      }`}
    >
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

function Card({
  title,
  children,
  href,
  linkLabel,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {href && linkLabel && (
          <Link href={href} className="text-xs text-emerald-600 hover:underline shrink-0">
            {linkLabel}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-bold text-slate-800 tabular-nums">{value}</div>
    </div>
  );
}
