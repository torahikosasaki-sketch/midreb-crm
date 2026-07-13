"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { updateDealField } from "@/lib/actions/deals";
import {
  BUSINESS_TYPES,
  PHASES,
  PHASE_COLORS,
  CONTRACTED_PHASE,
  formatYen,
  type Phase,
} from "@/lib/enums";

export type DealRow = {
  id: string;
  accountId: string | null;
  businessType: string;
  phase: string;
  customerized: boolean;
  probability: number;
  owner: string | null;
  mrr: number;
  oneTime: number;
  acv: number;
  weightedAcv: number;
};

type AccountOption = { id: string; name: string };

const cellSelect =
  "w-full bg-transparent px-1 py-1 text-sm rounded outline-none hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-400 cursor-pointer";

export function DealsTable({
  rows,
  accounts,
  owners,
}: {
  rows: DealRow[];
  accounts: AccountOption[];
  owners: string[];
}) {
  const [pending, startTransition] = useTransition();
  // 顧客化確認: 対象を保持している間モーダルを表示
  const [confirmCustomerize, setConfirmCustomerize] = useState<{ id: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  // モーダル決定待ちのフェーズ値を一時保持
  const pendingPhaseRef = usePendingPhase();

  function save(id: string, field: string, value: string, customerize?: boolean) {
    setSavingId(id);
    startTransition(async () => {
      await updateDealField(id, field, value, customerize);
      setSavingId(null);
    });
  }

  function onPhaseChange(row: DealRow, value: string) {
    if (value === CONTRACTED_PHASE && !row.customerized) {
      // フェーズ自体は「はい/いいえ」決定時にまとめて保存する
      pendingPhaseRef.set(row.id, value);
      setConfirmCustomerize({ id: row.id });
      return;
    }
    save(row.id, "phase", value);
  }

  function decideCustomerize(yes: boolean) {
    const target = confirmCustomerize;
    setConfirmCustomerize(null);
    if (!target) return;
    const value = pendingPhaseRef.get(target.id) ?? CONTRACTED_PHASE;
    pendingPhaseRef.clear(target.id);
    save(target.id, "phase", value, yes);
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="py-2 px-2 font-medium min-w-[160px]">顧客企業</th>
            <th className="py-2 px-2 font-medium min-w-[150px]">事業区分</th>
            <th className="py-2 px-2 font-medium min-w-[150px]">フェーズ</th>
            <th className="py-2 px-2 font-medium text-right w-20">確度</th>
            <th className="py-2 px-2 font-medium text-right w-24">月額</th>
            <th className="py-2 px-2 font-medium text-right w-24">単発</th>
            <th className="py-2 px-2 font-medium text-right w-24">ACV</th>
            <th className="py-2 px-2 font-medium text-right w-24">加重ACV</th>
            <th className="py-2 px-2 font-medium min-w-[110px]">担当者</th>
            <th className="py-2 px-2 w-14"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className={`border-b border-slate-100 hover:bg-slate-50/60 ${
                savingId === r.id && pending ? "opacity-60" : ""
              }`}
            >
              {/* 顧客企業 */}
              <td className="px-1">
                <select
                  className={cellSelect}
                  value={r.accountId ?? ""}
                  onChange={(e) => save(r.id, "accountId", e.target.value)}
                >
                  <option value="">（未設定）</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </td>

              {/* 事業区分 */}
              <td className="px-1">
                <select
                  className={cellSelect}
                  value={r.businessType}
                  onChange={(e) => save(r.id, "businessType", e.target.value)}
                >
                  {BUSINESS_TYPES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </td>

              {/* フェーズ */}
              <td className="px-1">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${PHASE_COLORS[r.phase as Phase] ?? "bg-slate-300"}`} />
                  <select
                    className={cellSelect}
                    value={r.phase}
                    onChange={(e) => onPhaseChange(r, e.target.value)}
                  >
                    {PHASES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </td>

              {/* 確度（%表示・保存は0〜1） */}
              <td className="px-1 text-right">
                <ProbabilityCell
                  value={r.probability}
                  onCommit={(pct) => save(r.id, "probability", String(pct / 100))}
                />
              </td>

              {/* 金額（明細から算出・読み取り専用） */}
              <td className="px-2 py-2 text-right tabular-nums text-slate-600">{r.mrr > 0 ? formatYen(r.mrr) : "—"}</td>
              <td className="px-2 py-2 text-right tabular-nums text-slate-600">{r.oneTime > 0 ? formatYen(r.oneTime) : "—"}</td>
              <td className="px-2 py-2 text-right tabular-nums text-slate-700">{formatYen(r.acv)}</td>
              <td className="px-2 py-2 text-right tabular-nums font-semibold text-emerald-700">{formatYen(r.weightedAcv)}</td>

              {/* 担当者 */}
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

              <td className="px-2 py-2 text-right">
                <Link href={`/deals/${r.id}`} className="text-emerald-600 hover:underline">
                  詳細
                </Link>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="py-10 text-center text-slate-400">
                該当する商談がありません
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {confirmCustomerize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-800">この商談を顧客化しますか？</h3>
            <p className="mt-2 text-sm text-slate-500">
              「はい」を選ぶと顧客ページに反映されます。商談は「契約締結済み」フェーズにそのまま残ります。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => decideCustomerize(false)}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                いいえ
              </button>
              <button
                type="button"
                onClick={() => decideCustomerize(true)}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                はい
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 確度セル: クリックで％入力、Enter/blur で確定 */
function ProbabilityCell({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (pct: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(Math.round(value * 100)));

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(String(Math.round(value * 100)));
          setEditing(true);
        }}
        className="w-full rounded px-1 py-1 text-right tabular-nums hover:bg-slate-50"
      >
        {Math.round(value * 100)}%
      </button>
    );
  }

  const commit = () => {
    setEditing(false);
    const n = Number(draft);
    const pct = Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : Math.round(value * 100);
    if (pct !== Math.round(value * 100)) onCommit(pct);
  };

  return (
    <input
      autoFocus
      type="number"
      min={0}
      max={100}
      step={5}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") setEditing(false);
      }}
      className="w-16 rounded border border-emerald-400 px-1 py-1 text-right text-sm outline-none focus:ring-1 focus:ring-emerald-400"
    />
  );
}

/** モーダル決定までフェーズ値を保持する簡易ストア */
function usePendingPhase() {
  const [map] = useState(() => new Map<string, string>());
  return {
    set: (id: string, v: string) => map.set(id, v),
    get: (id: string) => map.get(id),
    clear: (id: string) => map.delete(id),
  };
}
