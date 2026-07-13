import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatYen, linesMrr, linesOneTime, linesAcv } from "@/lib/enums";
import { Filters } from "@/components/Filters";
import { DealsTable, type DealRow } from "@/components/DealsTable";
import { ownerOptions } from "@/lib/employees";

export const dynamic = "force-dynamic";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ businessType?: string; owner?: string; phase?: string }>;
}) {
  const sp = await searchParams;

  const [deals, accounts, owners] = await Promise.all([
    prisma.deal.findMany({
      where: {
        ...(sp.businessType ? { businessType: sp.businessType } : {}),
        ...(sp.owner ? { owner: sp.owner } : {}),
        ...(sp.phase ? { phase: sp.phase } : {}),
      },
      include: { lineItems: true },
      orderBy: [{ phase: "asc" }, { position: "asc" }],
    }),
    prisma.account.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ownerOptions(),
  ]);

  const rows: DealRow[] = deals.map((d) => {
    const mrr = linesMrr(d.lineItems);
    const oneTime = linesOneTime(d.lineItems);
    const acv = linesAcv(d.lineItems);
    return {
      id: d.id,
      accountId: d.accountId,
      businessType: d.businessType,
      phase: d.phase,
      customerized: d.customerized,
      probability: d.probability,
      owner: d.owner,
      mrr,
      oneTime,
      acv,
      weightedAcv: Math.round(acv * d.probability),
    };
  });

  const totalWeighted = rows
    .filter((r) => r.phase !== "失注" && r.phase !== "保留")
    .reduce((s, r) => s + r.weightedAcv, 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      <Filters owners={owners} showPhase />
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
        <div className="text-sm">
          <span className="text-slate-500">{deals.length} 件</span>
          <span className="ml-4 text-slate-500">加重ACV合計</span>
          <span className="ml-1 font-bold text-emerald-700">{formatYen(totalWeighted)}</span>
          <span className="ml-4 text-xs text-slate-400">セルを直接編集して保存できます（金額は明細から自動算出）</span>
        </div>
        <Link
          href="/deals/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          ＋ 商談を追加
        </Link>
      </div>

      <div className="flex-1 min-h-0 px-6 py-3">
        <DealsTable rows={rows} accounts={accounts} owners={owners} />
      </div>
    </div>
  );
}
