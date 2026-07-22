import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateDeal, deleteDeal } from "@/lib/actions/deals";
import { DealForm, type DealInitial } from "@/components/DealForm";
import { DeleteButton } from "@/components/DeleteButton";
import { ActivityLog } from "@/components/ActivityLog";
import { LineItemEditor, type LineItem } from "@/components/LineItemEditor";
import { formatYen, linesMrr, linesOneTime, linesAcv } from "@/lib/enums";
import { ownerOptions } from "@/lib/employees";

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
      account: { include: { products: { orderBy: { name: "asc" } } } },
      activities: { orderBy: { occurredAt: "desc" } },
      lineItems: { orderBy: { position: "asc" } },
    },
  });
  if (!deal) notFound();

  const accounts = await prisma.account.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const owners = await ownerOptions(deal.owner);

  const lineItems: LineItem[] = deal.lineItems.map((l) => ({
    id: l.id,
    name: l.name,
    productId: l.productId,
    billingType: l.billingType,
    amount: l.amount,
    quantity: l.quantity,
    contractStart: ymd(l.contractStart),
    contractEnd: ymd(l.contractEnd),
    serviceMonth: l.serviceMonth ? l.serviceMonth.toISOString().slice(0, 7) : null,
    status: l.status,
  }));

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
    customerized: deal.customerized,
    probability: deal.probability,
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

  const mrr = linesMrr(lineItems);
  const oneTime = linesOneTime(lineItems);
  const acv = linesAcv(lineItems);
  const contracted = deal.customerized;

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <Link href="/deals" className="text-sm text-emerald-600 hover:underline">
            ← 商談一覧
          </Link>
          <div className="flex items-center gap-2 mt-1">
            {deal.accountId ? (
              <Link href={`/accounts/${deal.accountId}`} className="text-xl font-bold hover:text-emerald-700 hover:underline">
                {deal.account?.name ?? "(顧客未設定)"}
              </Link>
            ) : (
              <h1 className="text-xl font-bold">(顧客未設定)</h1>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                contracted ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {contracted ? "契約（顧客）" : "商談（締結前）"}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {deal.businessType} ・ {deal.phase} ・ 確度 {Math.round(deal.probability * 100)}% ・ 月額{" "}
            <span className="font-semibold text-emerald-700">{formatYen(mrr)}</span> ・ 単発{" "}
            <span className="font-semibold text-slate-700">{formatYen(oneTime)}</span> ・ ACV{" "}
            <span className="font-semibold text-emerald-700">{formatYen(acv)}</span>
          </p>
        </div>
        <DeleteButton action={deleteDeal.bind(null, id)} label="削除" />
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">契約明細（提供サービス・課金）</h2>
        <LineItemEditor dealId={id} lineItems={lineItems} accountProducts={deal.account?.products ?? []} />
      </section>

      <h2 className="text-sm font-semibold text-slate-700 mb-2">案件情報</h2>
      <DealForm
        action={updateDeal.bind(null, id)}
        accounts={accounts}
        owners={owners}
        initial={initial}
        submitLabel="保存"
      />

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">活動ログ</h2>
        <ActivityLog dealId={id} activities={activities} owners={owners} />
      </section>
    </div>
  );
}
