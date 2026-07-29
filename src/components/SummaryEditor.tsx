"use client";

import { useState, useTransition } from "react";
import { InsightList } from "@/components/InsightList";
import { upsertReportNote } from "@/lib/actions/reportNotes";
import type { InsightItem } from "@/lib/reports";

/**
 * サマリー欄。上段に自動生成の示唆（InsightList）、下段に運用担当者が加筆・修正できる
 * 手動メモのテキストエリアを表示する。保存はスコープ×期間キー単位。
 * 印刷時は編集UIを隠し、入力済みのメモ本文のみ表示する。
 */
export function SummaryEditor({
  insights,
  scope,
  refId,
  periodKey,
  initialNote,
  prevWord,
}: {
  insights: InsightItem[];
  scope: string;
  refId: string;
  periodKey: string;
  initialNote: string;
  prevWord: string;
}) {
  const [note, setNote] = useState(initialNote);
  const [saved, setSaved] = useState(initialNote);
  const [pending, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);

  const dirty = note !== saved;

  function save() {
    startTransition(async () => {
      await upsertReportNote(scope, refId, periodKey, note);
      setSaved(note);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    });
  }

  return (
    <div>
      {/* 自動生成の示唆 */}
      <InsightList items={insights} />

      {/* 担当者メモ（手動） */}
      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 print:border-0 print:p-0">
        <div className="flex items-center justify-between mb-1.5 print:hidden">
          <span className="text-xs font-medium text-slate-600">担当者メモ（手動・加筆／修正）</span>
          <div className="flex items-center gap-2">
            {justSaved && <span className="text-[11px] text-emerald-600">保存しました</span>}
            <button
              type="button"
              onClick={save}
              disabled={pending || !dirty}
              className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
        {/* 編集UI（画面表示のみ） */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={`自動生成のサマリーに対する補足や、${prevWord}比較の背景・施策メモなどを入力…`}
          className="print:hidden w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
        {/* 印刷用（保存済み本文のみ） */}
        {saved.trim() !== "" && (
          <div className="hidden print:block">
            <div className="text-xs font-medium text-slate-600 mb-1">担当者メモ</div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{saved}</p>
          </div>
        )}
      </div>
    </div>
  );
}
