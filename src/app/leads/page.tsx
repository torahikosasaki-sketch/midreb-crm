import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ownerOptions } from "@/lib/employees";
import { LeadsTable, type LeadRow } from "@/components/LeadsTable";
import { LEAD_ACTIVE_STATUSES } from "@/lib/enums";

export const dynamic = "force-dynamic";

function ymd(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export default async function LeadsPage() {
  const [leads, accounts, owners] = await Promise.all([
    prisma.lead.findMany({
      include: {
        account: { select: { name: true } },
        deal: { select: { id: true } },
        _count: { select: { activities: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.account.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ownerOptions(),
  ]);

  const rows: LeadRow[] = leads.map((l) => ({
    id: l.id,
    accountId: l.accountId,
    accountName: l.account.name,
    source: l.source,
    status: l.status,
    owner: l.owner,
    contactCount: l._count.activities,
    nextActionDate: ymd(l.nextActionDate),
    dealId: l.deal?.id ?? null,
  }));

  const activeCount = rows.filter((r) => LEAD_ACTIVE_STATUSES.includes(r.status as never)).length;
  const convertedCount = rows.filter((r) => r.status === "商談化").length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-5 md:px-6 py-3 border-b border-slate-200 bg-white gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-base">📥</div>
            <h1 className="text-base font-bold tracking-tight text-slate-900">リード</h1>
          </div>
          <div className="h-5 w-px bg-slate-200 shrink-0" />
          <div className="text-sm truncate">
            <span className="text-slate-500">{rows.length} 件</span>
            <span className="ml-3 text-slate-500">追客中</span>
            <span className="ml-1 font-bold text-slate-800">{activeCount}</span>
            <span className="ml-3 text-slate-500">商談化</span>
            <span className="ml-1 font-bold text-emerald-700">{convertedCount}</span>
            <span className="ml-3 text-xs text-slate-400 hidden lg:inline">セルを直接編集して保存できます（接触回数は活動ログから自動集計）</span>
          </div>
        </div>
        <Link
          href="/leads/new"
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition-colors"
        >
          ＋ リードを追加
        </Link>
      </div>

      <div className="flex-1 min-h-0 px-6 py-3">
        <LeadsTable rows={rows} accounts={accounts} owners={owners} />
      </div>
    </div>
  );
}
