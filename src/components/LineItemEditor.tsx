"use client";

import { useRef, useState, useTransition } from "react";
import {
  BILLING_TYPES,
  LINE_STATUSES,
  formatYen,
  linesMrr,
  linesOneTime,
  linesAcv,
} from "@/lib/enums";
import { createLineItem, updateLineItem, deleteLineItem, setLineStatus } from "@/lib/actions/lineItems";
import { SubmitButton } from "@/components/SubmitButton";

export type LineItem = {
  id: string;
  name: string;
  billingType: string;
  amount: number;
  quantity: number;
  contractStart: string | null; // yyyy-mm-dd
  contractEnd: string | null;
  serviceMonth: string | null; // yyyy-mm（単発の実施月）
  status: string;
};

type Draft = {
  name: string;
  billingType: string;
  amount: string;
  quantity: string;
  contractStart: string;
  contractEnd: string;
  serviceMonth: string;
  status: string;
};

function fmtDate(s: string | null): string {
  return s ? s.replaceAll("-", "/") : "—";
}

function fmtMonth(s: string | null): string {
  if (!s) return "—";
  const [y, m] = s.split("-");
  return `${y}年${Number(m)}月`;
}

export function LineItemEditor({
  dealId,
  lineItems,
}: {
  dealId: string;
  lineItems: LineItem[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [billing, setBilling] = useState<string>("月次定額");
  const [, startTransition] = useTransition();
  const add = createLineItem.bind(null, dealId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const mrr = linesMrr(lineItems);
  const oneTime = linesOneTime(lineItems);
  const acv = linesAcv(lineItems);

  function startEdit(li: LineItem) {
    setEditingId(li.id);
    setDraft({
      name: li.name,
      billingType: li.billingType,
      amount: String(li.amount),
      quantity: String(li.quantity),
      contractStart: li.contractStart ?? "",
      contractEnd: li.contractEnd ?? "",
      serviceMonth: li.serviceMonth ?? "",
      status: li.status,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function saveEdit(li: LineItem) {
    if (!draft) return;
    const fd = new FormData();
    fd.set("name", draft.name);
    fd.set("billingType", draft.billingType);
    fd.set("amount", draft.amount);
    fd.set("quantity", draft.quantity);
    if (draft.billingType === "月次定額") {
      fd.set("contractStart", draft.contractStart);
      fd.set("contractEnd", draft.contractEnd);
      fd.set("status", draft.status);
    } else {
      fd.set("serviceMonth", draft.serviceMonth);
    }
    startTransition(() => updateLineItem(li.id, dealId, fd));
    setEditingId(null);
    setDraft(null);
  }

  return (
    <div>
      {/* サマリ */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Sum label="月額 (MRR)" value={formatYen(mrr)} />
        <Sum label="単発合計" value={formatYen(oneTime)} />
        <Sum label="想定ACV (年換算)" value={formatYen(acv)} accent />
      </div>

      {/* 明細一覧 */}
      <div className="rounded-lg border border-slate-200 overflow-x-auto mb-3">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
              <th className="py-2 px-3 font-medium">品目</th>
              <th className="py-2 px-3 font-medium">課金</th>
              <th className="py-2 px-3 font-medium text-right">単価</th>
              <th className="py-2 px-3 font-medium text-right">数量</th>
              <th className="py-2 px-3 font-medium text-right">小計</th>
              <th className="py-2 px-3 font-medium">契約期間/実施月</th>
              <th className="py-2 px-3 font-medium">状態</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lineItems.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-400">
                  明細がありません。下で追加してください。
                </td>
              </tr>
            )}
            {lineItems.map((li) => {
              const recurring = li.billingType === "月次定額";
              const churned = li.status === "解約";
              const editing = editingId === li.id;

              if (editing && draft) {
                const draftRecurring = draft.billingType === "月次定額";
                return (
                  <tr key={li.id} className="border-b border-slate-100 bg-emerald-50/30">
                    <td className="py-1.5 px-2">
                      <input
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                        className={inp + " w-32"}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <select
                        value={draft.billingType}
                        onChange={(e) => setDraft({ ...draft, billingType: e.target.value })}
                        className={inp}
                      >
                        {BILLING_TYPES.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        min="0"
                        value={draft.amount}
                        onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                        className={inp + " w-24 text-right"}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        min="1"
                        value={draft.quantity}
                        onChange={(e) => setDraft({ ...draft, quantity: e.target.value })}
                        className={inp + " w-14 text-right"}
                      />
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-slate-400">—</td>
                    <td className="py-1.5 px-2">
                      {draftRecurring ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="date"
                            value={draft.contractStart}
                            onChange={(e) => setDraft({ ...draft, contractStart: e.target.value })}
                            className={inp + " w-32"}
                          />
                          <input
                            type="date"
                            value={draft.contractEnd}
                            onChange={(e) => setDraft({ ...draft, contractEnd: e.target.value })}
                            className={inp + " w-32"}
                          />
                        </div>
                      ) : (
                        <input
                          type="month"
                          value={draft.serviceMonth}
                          onChange={(e) => setDraft({ ...draft, serviceMonth: e.target.value })}
                          className={inp + " w-28"}
                        />
                      )}
                    </td>
                    <td className="py-1.5 px-2">
                      {draftRecurring ? (
                        <select
                          value={draft.status}
                          onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                          className={inp}
                        >
                          {LINE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => saveEdit(li)}
                        className="text-xs text-emerald-600 hover:underline mr-2"
                      >
                        保存
                      </button>
                      <button onClick={cancelEdit} className="text-xs text-slate-400 hover:underline">
                        キャンセル
                      </button>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={li.id} className="border-b border-slate-100">
                  <td className="py-2 px-3 font-medium">{li.name}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[11px] ${
                        recurring ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {li.billingType}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatYen(li.amount)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{li.quantity}</td>
                  <td className="py-2 px-3 text-right tabular-nums font-medium">
                    {formatYen(li.amount * li.quantity)}
                    {recurring && <span className="text-[10px] text-slate-400">/月</span>}
                  </td>
                  <td className="py-2 px-3 text-xs text-slate-500">
                    {recurring ? `${fmtDate(li.contractStart)}〜${fmtDate(li.contractEnd)}` : fmtMonth(li.serviceMonth)}
                  </td>
                  <td className="py-2 px-3">
                    {recurring ? (
                      <button
                        onClick={() =>
                          startTransition(() =>
                            setLineStatus(li.id, dealId, churned ? "契約中" : "解約")
                          )
                        }
                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                          churned
                            ? "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                        title="クリックで契約中/解約を切替"
                      >
                        {li.status}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => startEdit(li)}
                      className="text-xs text-slate-400 hover:text-emerald-600 mr-2"
                    >
                      編集
                    </button>
                    <form action={deleteLineItem.bind(null, li.id, dealId)} className="inline">
                      <button type="submit" className="text-xs text-slate-400 hover:text-rose-600">
                        削除
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 追加フォーム */}
      <form
        ref={formRef}
        action={async (fd) => {
          await add(fd);
          formRef.current?.reset();
          setBilling("月次定額");
        }}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-3"
      >
        <L label="品目 *">
          <input name="name" required className={inp + " w-36"} placeholder="TTS運用" />
        </L>
        <L label="課金タイプ">
          <select
            name="billingType"
            value={billing}
            onChange={(e) => setBilling(e.target.value)}
            className={inp}
          >
            {BILLING_TYPES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </L>
        <L label={billing === "月次定額" ? "月額" : "総額"}>
          <input name="amount" type="number" min="0" className={inp + " w-28"} />
        </L>
        <L label="数量">
          <input name="quantity" type="number" min="1" defaultValue={1} className={inp + " w-16"} />
        </L>
        {billing === "月次定額" ? (
          <>
            <L label="契約開始">
              <input name="contractStart" type="date" className={inp} />
            </L>
            <L label="更新予定">
              <input name="contractEnd" type="date" className={inp} />
            </L>
          </>
        ) : (
          <L label="実施月">
            <input name="serviceMonth" type="month" className={inp} />
          </L>
        )}
        <SubmitButton
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
          pendingLabel="追加中…"
        >
          ＋ 明細を追加
        </SubmitButton>
      </form>
    </div>
  );
}

const inp = "rounded-md border border-slate-300 px-2 py-1.5 text-sm";

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Sum({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-2.5 ${
        accent ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`font-bold tabular-nums ${accent ? "text-emerald-700" : "text-slate-800"}`}>
        {value}
      </div>
    </div>
  );
}
