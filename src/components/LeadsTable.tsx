"use client";

import Link from "next/link";
import { useTransition } from "react";
import { updateLeadField, convertLeadToDeal } from "@/lib/actions/leads";
import { LEAD_STATUSES, LEAD_SOURCES, LEAD_STATUS_COLORS } from "@/lib/enums";

export type LeadRow = {
  id: string;
  accountId: string;
  accountName: string;
  source: string | null;
  status: string;
  owner: string | null;
  contactCount: number;
  nextActionDate: string | null; // yyyy-mm-dd
  dealId: string | null;
};

type AccountOption = { id: string; name: string };

const cellSelect =
  "w-full bg-transparent px-1 py-1 text-sm rounded outline-none hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-400 cursor-pointer";

export function LeadsTable({
  rows,
  accounts,
  owners,
}: {
  rows: LeadRow[];
  accounts: AccountOption[];
  owners: string[];
}) {
  const [pending, startTransition] = useTransition();

  function save(id: string, field: string, value: string) {
    startTransition(async () => {
      await updateLeadField(id, field, value);
    });
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="py-2 px-2 font-medium min-w-[160px]">企業</th>
            <th className="py-2 px-2 font-medium min-w-[150px]">リードソース</th>
            <th className="py-2 px-2 font-medium min-w-[160px]">ステータス</th>
            <th className="py-2 px-2 font-medium min-w-[110px]">担当</th>
            <th className="py-2 px-2 font-medium text-right w-20">接触回数</th>
            <th className="py-2 px-2 font-medium w-28">次回アクション</th>
            <th className="py-2 px-2 w-28"></th>
          </tr>
        </thead>
        <tbody className={pending ? "opacity-70" : ""}>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/60">
              {/* 企業 */}
              <td className="px-1">
                <select
                  className={cellSelect}
                  value={r.accountId}
                  onChange={(e) => save(r.id, "accountId", e.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </td>

              {/* リードソース */}
              <td className="px-1">
                <select
                  className={cellSelect}
                  value={r.source ?? ""}
                  onChange={(e) => save(r.id, "source", e.target.value)}
                >
                  <option value="">—</option>
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  {r.source && !LEAD_SOURCES.includes(r.source as (typeof LEAD_SOURCES)[number]) && (
                    <option value={r.source}>{r.source}</option>
                  )}
                </select>
              </td>

              {/* ステータス */}
              <td className="px-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      LEAD_STATUS_COLORS[r.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    ●
                  </span>
                  <select
                    className={cellSelect}
                    value={r.status}
                    onChange={(e) => save(r.id, "status", e.target.value)}
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </td>

              {/* 担当 */}
              <td className="px-1">
                <select
                  className={cellSelect}
                  value={r.owner ?? ""}
                  onChange={(e) => save(r.id, "owner", e.target.value)}
                >
                  <option value="">—</option>
                  {owners.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                  {r.owner && !owners.includes(r.owner) && <option value={r.owner}>{r.owner}</option>}
                </select>
              </td>

              {/* 接触回数（自動集計・読み取り専用） */}
              <td className="px-2 py-2 text-right tabular-nums text-slate-700">{r.contactCount}</td>

              {/* 次回アクション */}
              <td className="px-2 py-2 text-slate-600 tabular-nums">{r.nextActionDate ?? "—"}</td>

              {/* アクション */}
              <td className="px-2 py-2 text-right whitespace-nowrap">
                <Link href={`/leads/${r.id}`} className="text-emerald-600 hover:underline">
                  詳細
                </Link>
                {r.dealId ? (
                  <Link href={`/deals/${r.dealId}`} className="ml-2 text-slate-500 hover:underline">
                    商談へ
                  </Link>
                ) : (
                  <form action={convertLeadToDeal.bind(null, r.id)} className="inline">
                    <button type="submit" className="ml-2 text-slate-500 hover:text-emerald-600 hover:underline">
                      商談化
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-10 text-center text-slate-400">
                リードがありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
