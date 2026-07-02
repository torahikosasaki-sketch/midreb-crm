import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateAccount, deleteAccount } from "@/lib/actions/accounts";
import { AccountForm, type AccountInitial } from "@/components/AccountForm";
import { DeleteButton } from "@/components/DeleteButton";
import { weightedRevenue, formatYen, PHASE_COLORS, type Phase } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      deals: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!account) notFound();

  const gmvTotal = account.deals.reduce((s, d) => s + d.expectedRevenue, 0);
  const weightedTotal = account.deals.reduce(
    (s, d) => s + weightedRevenue(d.expectedRevenue, d.probability),
    0
  );

  const initial: AccountInitial = {
    name: account.name,
    businessType: account.businessType,
    targetTier: account.targetTier,
    industry: account.industry,
    region: account.region,
    owner: account.owner,
    status: account.status,
    contactName: account.contactName,
    email: account.email,
    phone: account.phone,
    firstContactDate: account.firstContactDate?.toISOString().slice(0, 10) ?? null,
    salesTarget: account.salesTarget,
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <Link href="/accounts" className="text-sm text-sky-600 hover:underline">
            ← 顧客企業
          </Link>
          <h1 className="text-xl font-bold mt-1">{account.name}</h1>
          <p className="text-sm text-slate-500">
            商談 {account.deals.length} 件 ・ 想定GMV合計{" "}
            <span className="font-semibold text-slate-700">{formatYen(gmvTotal)}</span> ・ 加重売上{" "}
            <span className="font-semibold text-sky-700">{formatYen(weightedTotal)}</span>
          </p>
        </div>
        <DeleteButton action={deleteAccount.bind(null, id)} label="顧客企業を削除" />
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">紐づく商談</h2>
        {account.deals.length === 0 ? (
          <p className="text-sm text-slate-400">商談がありません</p>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {account.deals.map((d) => (
              <Link
                key={d.id}
                href={`/deals/${d.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-sm"
              >
                <span className={`h-2 w-2 rounded-full ${PHASE_COLORS[d.phase as Phase] ?? "bg-slate-300"}`} />
                <span className="w-28 text-slate-600">{d.phase}</span>
                <span className="w-32 text-slate-500">{d.businessType}</span>
                <span className="text-slate-500">確度 {Math.round(d.probability * 100)}%</span>
                <span className="ml-auto font-semibold text-sky-700 tabular-nums">
                  {formatYen(weightedRevenue(d.expectedRevenue, d.probability))}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">企業情報</h2>
        <AccountForm action={updateAccount.bind(null, id)} initial={initial} submitLabel="保存" />
      </section>
    </div>
  );
}
