import { prisma } from "@/lib/prisma";
import { formatYen, linesMrr, linesOneTime, linesAcv } from "@/lib/enums";
import { AccountsExplorer, type AccountRow } from "@/components/AccountsExplorer";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    include: {
      deals: { include: { lineItems: true } },
      _count: { select: { leads: true } },
    },
    orderBy: { name: "asc" },
  });

  // 企業（取引先）は「箱」。リード/商談を持つ段階から一覧に表示する。
  const rows: AccountRow[] = accounts.map((a) => {
    let mrr = 0;
    let oneTime = 0;
    let pipeline = 0;
    let contracts = 0;
    let openDeals = 0;
    let activeServices = 0;
    let churnMrr = 0;

    for (const d of a.deals) {
      if (d.customerized) {
        mrr += linesMrr(d.lineItems);
        oneTime += linesOneTime(d.lineItems);
        contracts += 1;
        for (const l of d.lineItems) {
          if (l.billingType === "月次定額") {
            if (l.status === "解約") churnMrr += l.amount * l.quantity;
            else activeServices += 1;
          }
        }
      } else if (d.phase !== "失注" && d.phase !== "保留") {
        // 進行中の商談（アップセル含む）
        openDeals += 1;
        pipeline += Math.round(linesAcv(d.lineItems) * d.probability);
      }
    }

    return {
      id: a.id,
      name: a.name,
      businessTypes: a.businessTypes,
      logoUrl: a.logoUrl,
      industry: a.industry,
      region: a.region,
      owner: a.owner,
      mrr,
      oneTime,
      pipeline,
      contracts,
      openDeals,
      leads: a._count.leads,
      activeServices,
      churnMrr,
    };
  });

  const totalMrr = rows.reduce((s, r) => s + r.mrr, 0);
  const churnMrr = rows.reduce((s, r) => s + r.churnMrr, 0);
  const expansion = rows.reduce((s, r) => s + r.pipeline, 0);
  const contractedCount = rows.filter((r) => r.contracts > 0).length;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ポートフォリオKPI帯 */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-px bg-slate-200 border-b border-slate-200">
        <Kpi label="総MRR" value={formatYen(totalMrr)} accent />
        <Kpi label="ARR（年換算）" value={formatYen(totalMrr * 12)} />
        <Kpi label="登録企業" value={`${rows.length} 社`} />
        <Kpi label="契約顧客" value={`${contractedCount} 社`} />
        <Kpi label="拡大パイプライン" value={formatYen(expansion)} />
        <Kpi label="解約MRR" value={formatYen(churnMrr)} danger={churnMrr > 0} />
      </div>

      <div className="flex-1 min-h-0">
        <AccountsExplorer rows={rows} />
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
