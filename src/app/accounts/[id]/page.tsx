import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateAccount, deleteAccount } from "@/lib/actions/accounts";
import { AccountForm, type AccountInitial } from "@/components/AccountForm";
import { DeleteButton } from "@/components/DeleteButton";
import {
  formatYen,
  linesMrr,
  linesOneTime,
  linesAcv,
  isContracted,
  PHASE_COLORS,
  type Phase,
} from "@/lib/enums";

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
      deals: { include: { lineItems: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!account) notFound();

  const contracts = account.deals.filter((d) => isContracted(d.phase));
  const opportunities = account.deals.filter(
    (d) => !isContracted(d.phase) && d.phase !== "失注" && d.phase !== "保留"
  );

  const mrr = contracts.reduce((s, d) => s + linesMrr(d.lineItems), 0);
  const oneTime = contracts.reduce((s, d) => s + linesOneTime(d.lineItems), 0);
  const activeServices = contracts.reduce(
    (s, d) => s + d.lineItems.filter((l) => l.billingType === "月次定額" && l.status !== "解約").length,
    0
  );
  const pipeline = opportunities.reduce(
    (s, d) => s + Math.round(linesAcv(d.lineItems) * d.probability),
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
          <Link href="/accounts" className="text-sm text-emerald-600 hover:underline">
            ← 顧客
          </Link>
          <h1 className="text-xl font-bold mt-1">{account.name}</h1>
          <p className="text-sm text-slate-500">
            {account.businessType ?? "—"} ・ {account.industry ?? "—"} ・ {account.region ?? "—"}
          </p>
        </div>
        <DeleteButton action={deleteAccount.bind(null, id)} label="顧客を削除" />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Kpi label="MRR（月額経常）" value={formatYen(mrr)} accent />
        <Kpi label="ARR（年換算）" value={formatYen(mrr * 12)} />
        <Kpi label="単発売上(受注済)" value={formatYen(oneTime)} />
        <Kpi label="契約中サービス" value={`${activeServices} 件`} />
      </div>

      {/* 契約（締結後） */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          契約（締結済み）<span className="text-slate-400 font-normal ml-1">{contracts.length}</span>
        </h2>
        {contracts.length === 0 ? (
          <p className="text-sm text-slate-400">締結済みの契約はありません</p>
        ) : (
          <div className="space-y-2">
            {contracts.map((d) => (
              <Link
                key={d.id}
                href={`/deals/${d.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-3 hover:border-emerald-300"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className={`h-2 w-2 rounded-full ${PHASE_COLORS[d.phase as Phase] ?? "bg-slate-300"}`} />
                  <span className="font-medium">{d.phase}</span>
                  <span className="text-slate-400 text-xs">{d.businessType}</span>
                  <span className="ml-auto text-xs text-slate-500">
                    月額 <span className="font-semibold text-emerald-700">{formatYen(linesMrr(d.lineItems))}</span>
                    {linesOneTime(d.lineItems) > 0 && (
                      <> ・ 単発 <span className="font-semibold text-slate-700">{formatYen(linesOneTime(d.lineItems))}</span></>
                    )}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {d.lineItems.map((l) => (
                    <span
                      key={l.id}
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        l.status === "解約"
                          ? "bg-rose-50 text-rose-500 line-through"
                          : l.billingType === "月次定額"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {l.name} {l.billingType === "月次定額" ? `${formatYen(l.amount)}/月` : formatYen(l.amount * l.quantity)}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 商談（締結前） */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          商談（締結前）<span className="text-slate-400 font-normal ml-1">{opportunities.length}</span>
          <span className="ml-3 text-xs font-normal text-slate-500">
            パイプライン加重 {formatYen(pipeline)}
          </span>
        </h2>
        {opportunities.length === 0 ? (
          <p className="text-sm text-slate-400">進行中の商談はありません</p>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {opportunities.map((d) => (
              <Link
                key={d.id}
                href={`/deals/${d.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-sm"
              >
                <span className={`h-2 w-2 rounded-full ${PHASE_COLORS[d.phase as Phase] ?? "bg-slate-300"}`} />
                <span className="w-24 text-slate-600">{d.phase}</span>
                <span className="text-slate-500">確度 {Math.round(d.probability * 100)}%</span>
                <span className="ml-auto font-semibold text-emerald-700 tabular-nums">
                  ACV {formatYen(linesAcv(d.lineItems))}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">企業情報・連絡先</h2>
        <AccountForm action={updateAccount.bind(null, id)} initial={initial} submitLabel="保存" />
      </section>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        accent ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${accent ? "text-emerald-700" : "text-slate-800"}`}>
        {value}
      </div>
    </div>
  );
}
