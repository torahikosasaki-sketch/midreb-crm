import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateAccount, deleteAccount } from "@/lib/actions/accounts";
import { AccountForm, type AccountInitial } from "@/components/AccountForm";
import { DeleteButton } from "@/components/DeleteButton";
import { ownerOptions } from "@/lib/employees";
import {
  formatYen,
  linesMrr,
  linesOneTime,
  linesAcv,
  bizTagClass,
  PHASE_COLORS,
  LEAD_STATUS_COLORS,
  type Phase,
} from "@/lib/enums";

function fmtDateTime(d: Date): string {
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

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
      deals: {
        include: { lineItems: true, activities: { orderBy: { occurredAt: "desc" } } },
        orderBy: { createdAt: "desc" },
      },
      leads: {
        include: {
          activities: { orderBy: { occurredAt: "desc" } },
          deal: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!account) notFound();

  const owners = await ownerOptions(account.owner);
  const contracts = account.deals.filter((d) => d.customerized);
  const opportunities = account.deals.filter(
    (d) => !d.customerized && d.phase !== "失注" && d.phase !== "保留"
  );

  // 対応履歴: リード + 商談の活動ログを時系列でマージ
  const history = [
    ...account.leads.flatMap((l) =>
      l.activities.map((a) => ({ ...a, ctx: `リード` as const }))
    ),
    ...account.deals.flatMap((d) =>
      d.activities.map((a) => ({ ...a, ctx: `商談` as const }))
    ),
  ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

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
    businessTypes: account.businessTypes,
    products: account.products,
    logoUrl: account.logoUrl,
    industry: account.industry,
    region: account.region,
    owner: account.owner,
    status: account.status,
    contactName: account.contactName,
    email: account.email,
    phone: account.phone,
  };

  const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-4 flex items-start justify-between">
        <div className="min-w-0">
          <Link href="/accounts" className="text-sm text-emerald-600 hover:underline">
            ← 顧客
          </Link>
          <div className="flex items-center gap-3 mt-1">
            {account.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={account.logoUrl}
                alt={account.name}
                className="h-12 w-12 rounded-lg object-contain border border-slate-200 bg-white shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold shrink-0">
                {account.name.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{account.name}</h1>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                {account.businessTypes.map((t) => (
                  <span key={t} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${bizTagClass(t)}`}>
                    {t}
                  </span>
                ))}
                <span className="text-xs text-slate-400">
                  {account.industry ?? "—"} ・ {account.region ?? "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <DeleteButton action={deleteAccount.bind(null, id)} label="顧客を削除" />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <Kpi label="MRR（月額経常）" value={formatYen(mrr)} accent />
        <Kpi label="ARR（年換算）" value={formatYen(mrr * 12)} />
        <Kpi label="単発売上(受注済)" value={formatYen(oneTime)} />
        <Kpi label="契約中サービス" value={`${activeServices} 件`} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-8 max-w-md">
        <Kpi label="初回接触日（自動）" value={ymd(account.firstContactDate)} />
        <Kpi label="契約締結日（自動）" value={ymd(account.contractDate)} />
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
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">
            商談（締結前）<span className="text-slate-400 font-normal ml-1">{opportunities.length}</span>
            <span className="ml-3 text-xs font-normal text-slate-500">
              パイプライン加重 {formatYen(pipeline)}
            </span>
          </h2>
          <Link
            href={`/deals/new?accountId=${id}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            ＋ 商談を直接追加
          </Link>
        </div>
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

      {/* リード */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-slate-700">
            リード<span className="text-slate-400 font-normal ml-1">{account.leads.length}</span>
          </h2>
          <Link
            href={`/leads/new?accountId=${id}`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            ＋ リードを追加
          </Link>
        </div>
        {account.leads.length === 0 ? (
          <p className="text-sm text-slate-400">リードはありません</p>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
            {account.leads.map((l) => (
              <Link
                key={l.id}
                href={`/leads/${l.id}`}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-sm"
              >
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    LEAD_STATUS_COLORS[l.status] ?? "bg-slate-100 text-slate-600"
                  }`}
                >
                  {l.status}
                </span>
                <span className="text-slate-500">{l.source ?? "—"}</span>
                <span className="text-xs text-slate-400">接触 {l.activities.length} 回</span>
                {l.deal && <span className="text-xs text-emerald-600">商談化済み</span>}
                <span className="ml-auto text-xs text-slate-500">{l.owner ?? "—"}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 対応履歴 */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          対応履歴<span className="text-slate-400 font-normal ml-1">{history.length}</span>
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-slate-400">対応履歴はありません</p>
        ) : (
          <ol className="relative border-l border-slate-200 ml-2">
            {history.slice(0, 30).map((a) => (
              <li key={a.id} className="mb-3 ml-4">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                <div className="flex items-center gap-2">
                  <span className="rounded px-1.5 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600">
                    {a.ctx}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500">{a.type}</span>
                  <time className="text-xs text-slate-400">{fmtDateTime(a.occurredAt)}</time>
                  {a.owner && <span className="text-xs text-slate-500">{a.owner}</span>}
                </div>
                {a.content && <p className="mt-0.5 text-sm text-slate-700">{a.content}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">企業情報・連絡先</h2>
        <AccountForm action={updateAccount.bind(null, id)} owners={owners} initial={initial} submitLabel="保存" />
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
