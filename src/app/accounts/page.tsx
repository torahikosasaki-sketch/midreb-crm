import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatYen, linesMrr, linesOneTime, linesAcv, isContracted } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    include: {
      deals: {
        select: { phase: true, probability: true, lineItems: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = accounts.map((a) => {
    let mrr = 0;
    let oneTime = 0;
    let pipeline = 0;
    let contracts = 0;
    for (const d of a.deals) {
      if (isContracted(d.phase)) {
        mrr += linesMrr(d.lineItems);
        oneTime += linesOneTime(d.lineItems);
        contracts += 1;
      } else if (d.phase !== "失注" && d.phase !== "保留") {
        pipeline += Math.round(linesAcv(d.lineItems) * d.probability);
      }
    }
    return { a, mrr, oneTime, pipeline, contracts };
  });

  const totalMrr = rows.reduce((s, r) => s + r.mrr, 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
        <div className="text-sm">
          <span className="text-slate-500">{accounts.length} 社</span>
          <span className="ml-4 text-slate-500">合計MRR</span>
          <span className="ml-1 font-bold text-emerald-700">{formatYen(totalMrr)}</span>
        </div>
        <Link
          href="/accounts/new"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          ＋ 顧客企業を追加
        </Link>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-6">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-4 font-medium">企業名</th>
              <th className="py-2 pr-4 font-medium">事業区分</th>
              <th className="py-2 pr-4 font-medium">業種</th>
              <th className="py-2 pr-4 font-medium text-right">契約数</th>
              <th className="py-2 pr-4 font-medium text-right">MRR</th>
              <th className="py-2 pr-4 font-medium text-right">単発(受注済)</th>
              <th className="py-2 pr-4 font-medium text-right">商談パイプライン</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ a, mrr, oneTime, pipeline, contracts }) => (
              <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 pr-4 font-medium">{a.name}</td>
                <td className="py-2 pr-4 text-slate-600">{a.businessType ?? "—"}</td>
                <td className="py-2 pr-4 text-slate-600">{a.industry ?? "—"}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{contracts}</td>
                <td className="py-2 pr-4 text-right tabular-nums font-semibold text-emerald-700">
                  {mrr > 0 ? formatYen(mrr) : "—"}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-slate-600">
                  {oneTime > 0 ? formatYen(oneTime) : "—"}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-slate-500">
                  {pipeline > 0 ? formatYen(pipeline) : "—"}
                </td>
                <td className="py-2 text-right">
                  <Link href={`/accounts/${a.id}`} className="text-emerald-600 hover:underline">
                    詳細
                  </Link>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400">
                  顧客企業がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
