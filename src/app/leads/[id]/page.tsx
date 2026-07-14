import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateLead, deleteLead, convertLeadToDeal } from "@/lib/actions/leads";
import { LeadForm, type LeadInitial } from "@/components/LeadForm";
import { DeleteButton } from "@/components/DeleteButton";
import { ActivityLog } from "@/components/ActivityLog";
import { SubmitButton } from "@/components/SubmitButton";
import { ownerOptions } from "@/lib/employees";
import { LEAD_STATUS_COLORS } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      account: { select: { id: true, name: true } },
      deal: { select: { id: true } },
      activities: { orderBy: { occurredAt: "desc" } },
    },
  });
  if (!lead) notFound();

  const [accounts, owners] = await Promise.all([
    prisma.account.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ownerOptions(lead.owner),
  ]);

  const initial: LeadInitial = {
    accountId: lead.accountId,
    source: lead.source,
    status: lead.status,
    owner: lead.owner,
    nextActionDate: lead.nextActionDate?.toISOString().slice(0, 10) ?? null,
    memo: lead.memo,
  };

  const activities = lead.activities.map((a) => ({
    id: a.id,
    type: a.type,
    content: a.content,
    owner: a.owner,
    occurredAt: a.occurredAt.toISOString(),
  }));

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <Link href="/leads" className="text-sm text-emerald-600 hover:underline">
            ← リード
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <Link
              href={`/accounts/${lead.account.id}`}
              className="text-xl font-bold hover:text-emerald-700 hover:underline"
            >
              {lead.account.name}
            </Link>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                LEAD_STATUS_COLORS[lead.status] ?? "bg-slate-100 text-slate-600"
              }`}
            >
              {lead.status}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            リードソース {lead.source ?? "—"} ・ 接触 {lead.activities.length} 回
          </p>
        </div>
        <DeleteButton action={deleteLead.bind(null, id)} label="削除" />
      </div>

      {/* 商談化 */}
      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-4">
        {lead.deal ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">この商談は商談化済みです。</span>
            <Link
              href={`/deals/${lead.deal.id}`}
              className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              商談を開く →
            </Link>
          </div>
        ) : (
          <form action={convertLeadToDeal.bind(null, id)} className="flex items-center justify-between">
            <span className="text-sm text-slate-600">
              商談化すると、この企業の商談（初回商談予定）を1件生成します。
            </span>
            <SubmitButton
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              pendingLabel="商談化中…"
            >
              この商談を商談化する
            </SubmitButton>
          </form>
        )}
      </section>

      <h2 className="text-sm font-semibold text-slate-700 mb-2">リード情報</h2>
      <LeadForm action={updateLead.bind(null, id)} accounts={accounts} owners={owners} initial={initial} submitLabel="保存" />

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">接触履歴（活動ログ）</h2>
        <ActivityLog leadId={id} activities={activities} owners={owners} />
      </section>
    </div>
  );
}
