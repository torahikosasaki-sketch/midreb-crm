import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { weightedRevenue, formatYen } from "@/lib/enums";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const accounts = await prisma.account.findMany({
    include: { deals: { select: { expectedRevenue: true, probability: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
        <span className="text-sm text-slate-500">{accounts.length} 社</span>
        <Link
          href="/accounts/new"
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
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
              <th className="py-2 pr-4 font-medium">国内/海外</th>
              <th className="py-2 pr-4 font-medium text-right">商談数</th>
              <th className="py-2 pr-4 font-medium text-right">想定GMV合計</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => {
              const gmvTotal = a.deals.reduce((s, d) => s + d.expectedRevenue, 0);
              return (
                <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 pr-4 font-medium">{a.name}</td>
                  <td className="py-2 pr-4 text-slate-600">{a.businessType ?? "—"}</td>
                  <td className="py-2 pr-4 text-slate-600">{a.industry ?? "—"}</td>
                  <td className="py-2 pr-4 text-slate-600">{a.region ?? "—"}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{a.deals.length}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-slate-700">
                    {formatYen(gmvTotal)}
                  </td>
                  <td className="py-2 text-right">
                    <Link href={`/accounts/${a.id}`} className="text-sky-600 hover:underline">
                      詳細
                    </Link>
                  </td>
                </tr>
              );
            })}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
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
