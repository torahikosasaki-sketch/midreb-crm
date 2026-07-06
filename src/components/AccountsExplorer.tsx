"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatYen } from "@/lib/enums";

export type AccountRow = {
  id: string;
  name: string;
  businessType: string | null;
  industry: string | null;
  region: string | null;
  owner: string | null;
  mrr: number;
  oneTime: number;
  pipeline: number; // 拡大（締結前の商談）加重ACV
  contracts: number;
  activeServices: number;
  churnMrr: number;
};

type Sort = "mrr" | "pipeline" | "name";

export function AccountsExplorer({ rows }: { rows: AccountRow[] }) {
  const [query, setQuery] = useState("");
  const [biz, setBiz] = useState("");
  const [churnOnly, setChurnOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("mrr");

  const bizTypes = useMemo(
    () => [...new Set(rows.map((r) => r.businessType).filter(Boolean) as string[])].sort(),
    [rows]
  );
  const maxMrr = useMemo(() => Math.max(1, ...rows.map((r) => r.mrr)), [rows]);
  const churnCount = useMemo(() => rows.filter((r) => r.churnMrr > 0).length, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (biz && r.businessType !== biz) return false;
      if (churnOnly && r.churnMrr <= 0) return false;
      if (q && !r.name.toLowerCase().includes(q) && !(r.owner ?? "").toLowerCase().includes(q))
        return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "ja");
      if (sort === "pipeline") return b.pipeline - a.pipeline;
      return b.mrr - a.mrr;
    });
    return list;
  }, [rows, query, biz, churnOnly, sort]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-2.5 border-b border-slate-200 bg-white">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="企業名・担当者で検索"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm w-56 outline-none focus:border-emerald-500"
        />
        <select
          value={biz}
          onChange={(e) => setBiz(e.target.value)}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
        >
          <option value="">事業区分（すべて）</option>
          {bizTypes.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <button
          onClick={() => setChurnOnly((v) => !v)}
          className={`rounded-md px-2.5 py-1.5 text-sm font-medium border transition-colors ${
            churnOnly
              ? "bg-rose-600 text-white border-rose-600"
              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
          }`}
        >
          解約リスクのみ
          <span className={`ml-1 text-xs ${churnOnly ? "text-rose-100" : "text-slate-400"}`}>{churnCount}</span>
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
        >
          <option value="mrr">MRR 降順</option>
          <option value="pipeline">拡大パイプライン 降順</option>
          <option value="name">企業名 順</option>
        </select>
        <span className="ml-auto text-xs text-slate-400">{shown.length} 社</span>
        <Link
          href="/accounts/new"
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          ＋ 顧客を追加
        </Link>
      </div>

      {/* リスト */}
      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-2">
        {shown.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-16">該当する顧客がいません</p>
        )}
        {shown.map((r) => (
          <Link
            key={r.id}
            href={`/accounts/${r.id}`}
            className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-emerald-300 hover:shadow-sm transition-all"
          >
            {/* 左: 企業名 + バッジ */}
            <div className="min-w-0 w-64 shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{r.name}</span>
                {r.churnMrr > 0 && (
                  <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-600">
                    解約あり
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-slate-400">
                {r.businessType && <span>{r.businessType}</span>}
                {r.industry && <span>・{r.industry}</span>}
                {r.region && <span>・{r.region}</span>}
              </div>
            </div>

            {/* 中: MRR + 相対バー */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-slate-400">MRR</span>
                <span className="font-bold text-emerald-700 tabular-nums">
                  {r.mrr > 0 ? formatYen(r.mrr) : "—"}
                </span>
                <span className="text-[11px] text-slate-400">
                  契約 {r.contracts}・サービス {r.activeServices}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full max-w-xs rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.round((r.mrr / maxMrr) * 100)}%` }}
                />
              </div>
            </div>

            {/* 右: 単発 / 拡大パイプライン / 担当 */}
            <div className="hidden md:flex items-center gap-6 text-right shrink-0">
              <Metric label="単発(受注済)" value={r.oneTime > 0 ? formatYen(r.oneTime) : "—"} />
              <Metric label="拡大パイプライン" value={r.pipeline > 0 ? formatYen(r.pipeline) : "—"} />
              <div className="w-16">
                <div className="text-[10px] text-slate-400">担当</div>
                <div className="text-sm text-slate-600 truncate">{r.owner ?? "—"}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-28">
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="text-sm font-medium text-slate-700 tabular-nums">{value}</div>
    </div>
  );
}
