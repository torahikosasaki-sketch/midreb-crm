import { prisma } from "@/lib/prisma";
import { weightedRevenue, formatYen, BUSINESS_TYPES } from "@/lib/enums";
import { MonthlyChart, type MonthRow } from "@/components/MonthlyChart";

export const dynamic = "force-dynamic";

function monthKey(d: Date | null): string {
  if (!d) return "未定";
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function PipelinePage() {
  const deals = await prisma.deal.findMany({
    where: { phase: { notIn: ["失注", "保留"] } },
  });

  // 月 × 事業区分 で加重売上を集計
  const map = new Map<string, Record<string, number>>();
  for (const d of deals) {
    const key = monthKey(d.expectedCloseDate);
    const w = weightedRevenue(d.expectedRevenue, d.probability);
    const row = map.get(key) ?? {};
    row[d.businessType] = (row[d.businessType] ?? 0) + w;
    map.set(key, row);
  }

  // 「未定」を末尾に回し、それ以外は月順にソート
  const keys = [...map.keys()].sort((a, b) => {
    if (a === "未定") return 1;
    if (b === "未定") return -1;
    return a.localeCompare(b);
  });

  const data: MonthRow[] = keys.map((k) => {
    const row = map.get(k)!;
    const out: MonthRow = { month: k };
    for (const b of BUSINESS_TYPES) out[b] = row[b] ?? 0;
    return out;
  });

  const grandTotal = deals.reduce(
    (s, d) => s + weightedRevenue(d.expectedRevenue, d.probability),
    0
  );

  const monthTotals = keys.map((k) => {
    const row = map.get(k)!;
    return { month: k, total: Object.values(row).reduce((s, v) => s + v, 0) };
  });

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-xl font-bold">月次パイプライン集計</h1>
        <div className="text-sm">
          <span className="text-slate-500">加重売上合計</span>
          <span className="ml-2 text-xl font-bold text-emerald-700">{formatYen(grandTotal)}</span>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        受注予定日の月 × 事業区分で集計（失注・保留を除く）。受注予定日未設定は「未定」。
      </p>

      <div className="rounded-lg border border-slate-200 bg-white p-4 mb-6">
        {data.length === 0 ? (
          <p className="text-sm text-slate-400 py-10 text-center">対象データがありません</p>
        ) : (
          <MonthlyChart data={data} />
        )}
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="py-2 pr-4 font-medium">月</th>
            {BUSINESS_TYPES.map((b) => (
              <th key={b} className="py-2 pr-4 font-medium text-right">
                {b}
              </th>
            ))}
            <th className="py-2 pr-4 font-medium text-right">合計</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const total = monthTotals.find((m) => m.month === row.month)?.total ?? 0;
            return (
              <tr key={row.month} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-medium">{row.month}</td>
                {BUSINESS_TYPES.map((b) => (
                  <td key={b} className="py-2 pr-4 text-right tabular-nums text-slate-600">
                    {(row[b] as number) > 0 ? formatYen(row[b] as number) : "—"}
                  </td>
                ))}
                <td className="py-2 pr-4 text-right tabular-nums font-semibold text-emerald-700">
                  {formatYen(total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
