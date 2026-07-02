import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { weightedRevenue, formatYen, PHASE_COLORS, type Phase } from "@/lib/enums";
import { Filters } from "@/components/Filters";

export const dynamic = "force-dynamic";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ businessType?: string; owner?: string; phase?: string }>;
}) {
  const sp = await searchParams;

  const deals = await prisma.deal.findMany({
    where: {
      ...(sp.businessType ? { businessType: sp.businessType } : {}),
      ...(sp.owner ? { owner: sp.owner } : {}),
      ...(sp.phase ? { phase: sp.phase } : {}),
    },
    include: { account: { select: { name: true } } },
    orderBy: [{ phase: "asc" }, { position: "asc" }],
  });

  const ownerRows = await prisma.deal.findMany({
    where: { owner: { not: null } },
    select: { owner: true },
    distinct: ["owner"],
  });
  const owners = ownerRows.map((r) => r.owner!).filter(Boolean).sort();

  const totalWeighted = deals
    .filter((d) => d.phase !== "失注" && d.phase !== "保留")
    .reduce((s, d) => s + weightedRevenue(d.expectedRevenue, d.probability), 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      <Filters owners={owners} showPhase />
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
        <div className="text-sm">
          <span className="text-slate-500">{deals.length} 件</span>
          <span className="ml-4 text-slate-500">加重売上合計</span>
          <span className="ml-1 font-bold text-emerald-700">{formatYen(totalWeighted)}</span>
        </div>
        <Link
          href="/deals/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          ＋ 商談を追加
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-4 font-medium">顧客企業</th>
              <th className="py-2 pr-4 font-medium">事業区分</th>
              <th className="py-2 pr-4 font-medium">フェーズ</th>
              <th className="py-2 pr-4 font-medium text-right">確度</th>
              <th className="py-2 pr-4 font-medium text-right">想定売上</th>
              <th className="py-2 pr-4 font-medium text-right">加重売上</th>
              <th className="py-2 pr-4 font-medium">担当者</th>
              <th className="py-2 pr-4 font-medium">受注予定</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 pr-4 font-medium">
                  {d.account?.name ?? "(未設定)"}
                </td>
                <td className="py-2 pr-4 text-slate-600">{d.businessType}</td>
                <td className="py-2 pr-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${PHASE_COLORS[d.phase as Phase] ?? "bg-slate-300"}`} />
                    {d.phase}
                  </span>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {Math.round(d.probability * 100)}%
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-slate-600">
                  {formatYen(d.expectedRevenue)}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums font-semibold text-emerald-700">
                  {formatYen(weightedRevenue(d.expectedRevenue, d.probability))}
                </td>
                <td className="py-2 pr-4 text-slate-600">{d.owner ?? "—"}</td>
                <td className="py-2 pr-4 text-slate-600">
                  {d.expectedCloseDate ? d.expectedCloseDate.toISOString().slice(0, 10) : "—"}
                </td>
                <td className="py-2 text-right">
                  <Link href={`/deals/${d.id}`} className="text-emerald-600 hover:underline">
                    詳細
                  </Link>
                </td>
              </tr>
            ))}
            {deals.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400">
                  該当する商談がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
