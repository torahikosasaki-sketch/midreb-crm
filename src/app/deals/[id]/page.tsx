import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateDeal, deleteDeal } from "@/lib/actions/deals";
import { DealForm, type DealInitial } from "@/components/DealForm";
import { DeleteButton } from "@/components/DeleteButton";
import { ActivityLog } from "@/components/ActivityLog";
import { TalentAssign } from "@/components/TalentAssign";
import { weightedRevenue, formatYen } from "@/lib/enums";

export const dynamic = "force-dynamic";

function ymd(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      account: true,
      activities: { orderBy: { occurredAt: "desc" } },
      talents: { include: { talent: true } },
    },
  });
  if (!deal) notFound();

  const accounts = await prisma.account.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const allTalents = await prisma.talent.findMany({ orderBy: { name: "asc" } });
  const assignedIds = new Set(deal.talents.map((dt) => dt.talentId));
  const assigned = deal.talents.map((dt) => ({
    id: dt.talent.id,
    name: dt.talent.name,
    type: dt.talent.type,
  }));
  const available = allTalents
    .filter((t) => !assignedIds.has(t.id))
    .map((t) => ({ id: t.id, name: t.name, type: t.type }));

  const activities = deal.activities.map((a) => ({
    id: a.id,
    type: a.type,
    content: a.content,
    owner: a.owner,
    occurredAt: a.occurredAt.toISOString(),
  }));

  const initial: DealInitial = {
    accountId: deal.accountId,
    businessType: deal.businessType,
    phase: deal.phase,
    probability: deal.probability,
    services: deal.services,
    expectedRevenue: deal.expectedRevenue,
    inflowChannel: deal.inflowChannel,
    agencyName: deal.agencyName,
    owner: deal.owner,
    expectedCloseDate: ymd(deal.expectedCloseDate),
    nextActionDate: ymd(deal.nextActionDate),
    chatTool: deal.chatTool,
    channelName: deal.channelName,
    contractStatus: deal.contractStatus,
    contractType: deal.contractType,
    contractLink: deal.contractLink,
    memo: deal.memo,
  };

  const weighted = weightedRevenue(deal.expectedRevenue, deal.probability);

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <Link href="/deals" className="text-sm text-sky-600 hover:underline">
            ← 商談一覧
          </Link>
          <h1 className="text-xl font-bold mt-1">
            {deal.account?.name ?? "(顧客未設定)"}
          </h1>
          <p className="text-sm text-slate-500">
            {deal.businessType} ・ {deal.phase} ・ 確度 {Math.round(deal.probability * 100)}% ・ 加重売上{" "}
            <span className="font-semibold text-sky-700">{formatYen(weighted)}</span>
          </p>
        </div>
        <DeleteButton action={deleteDeal.bind(null, id)} label="商談を削除" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">商談情報</h2>
          <DealForm
            action={updateDeal.bind(null, id)}
            accounts={accounts}
            initial={initial}
            submitLabel="保存"
          />
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-2">アサイン人材</h2>
            <TalentAssign dealId={id} assigned={assigned} available={available} />
          </section>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">活動ログ</h2>
        <ActivityLog dealId={id} activities={activities} />
      </section>
    </div>
  );
}
