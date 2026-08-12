"use client";

import { useState, useTransition } from "react";
import {
  previewUnitCsvImport,
  commitUnitCsvImport,
  type UnitCsvPreview,
  type UnitCsvResult,
} from "@/lib/actions/importProgress";

const yen = (n: number) => "¥" + n.toLocaleString("ja-JP");

export function UnitCsvImport({ salesUnitId, storedCount }: { salesUnitId: string; storedCount: number }) {
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<UnitCsvPreview | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [remember, setRemember] = useState(true);
  const [result, setResult] = useState<UnitCsvResult | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setResult(null);
    setPreview(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    startTransition(async () => {
      try {
        const p = await previewUnitCsvImport(salesUnitId, text);
        setPreview(p);
        // 記憶済み(linked)を初期選択。無ければ空（手動選択）
        setChecked(new Set(p.skus.filter((s) => s.linked).map((s) => s.skuId)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "プレビューに失敗しました。");
      }
    });
  }

  function toggle(skuId: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(skuId)) next.delete(skuId);
      else next.add(skuId);
      return next;
    });
  }

  function onCommit() {
    if (!preview) return;
    setError("");
    startTransition(async () => {
      try {
        const res = await commitUnitCsvImport(salesUnitId, csvText, [...checked], remember);
        setResult(res);
        setPreview(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "取り込みに失敗しました。");
      }
    });
  }

  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
        <span>⬆ セラーセンターCSVから取り込む</span>
        {storedCount > 0 ? (
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">SKUひも付け済み {storedCount}件・自動</span>
        ) : (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">初回はSKU選択が必要</span>
        )}
      </summary>

      <div className="border-t border-slate-100 p-4 space-y-3">
        <p className="text-xs text-slate-500">
          注文明細CSV（全商品混在で可）を選ぶと、この販売単位のSKUだけ集約して 売上個数・売上金額・注文数 に取り込みます。
          {storedCount > 0
            ? "ひも付け済みのため、アップロードすると対象SKUが自動選択されます。"
            : "初回はこの単位に該当するSKUを選び、「記憶する」で保存すると次回以降は自動になります。"}
          （動画/ライブ実績は変更しません。同一日付は上書き）
        </p>

        <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={pending} className="text-sm" />
        {fileName && <span className="ml-2 text-xs text-slate-500">{fileName}</span>}
        {pending && <p className="text-xs text-slate-400">処理中…</p>}

        {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        {result && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            取り込み完了: 日次実績 新規 {result.created} 件 / 更新 {result.updated} 件（{result.days}日分・SKU {result.skusUsed}件）。
            {result.remembered && <span className="ml-1 text-emerald-700">SKUひも付けを記憶しました。</span>}
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              <span>対象 <strong>{preview.orderRows}</strong> 行</span>
              <span>SKU <strong>{preview.skus.length}</strong> 種</span>
              {preview.dateRange && <span>期間 <strong>{preview.dateRange.min}〜{preview.dateRange.max}</strong></span>}
              {preview.linkedCount > 0 && <span className="text-emerald-700">記憶済みSKU {preview.linkedCount}件を自動選択</span>}
            </div>

            {preview.warnings.length > 0 && (
              <ul className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 list-disc list-inside">
                {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}

            <div className="overflow-auto rounded-lg border border-slate-200 max-h-80">
              <table className="w-full text-sm bg-white">
                <thead className="sticky top-0">
                  <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                    <th className="py-2 px-3 font-medium w-10">取込</th>
                    <th className="py-2 px-3 font-medium">商品名 / SKU ID</th>
                    <th className="py-2 px-3 font-medium text-right">売上個数</th>
                    <th className="py-2 px-3 font-medium text-right">売上金額</th>
                    <th className="py-2 px-3 font-medium text-right">注文数</th>
                    <th className="py-2 px-3 font-medium text-right">日数</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.skus.map((s) => {
                    const on = checked.has(s.skuId);
                    return (
                      <tr key={s.skuId} className={`border-b border-slate-100 ${on ? "bg-emerald-50/40" : ""}`}>
                        <td className="py-1.5 px-3">
                          <input type="checkbox" checked={on} onChange={() => toggle(s.skuId)} />
                        </td>
                        <td className="py-1.5 px-3 max-w-[24rem]">
                          <div className="truncate" title={s.productName}>{s.productName}</div>
                          <div className="text-[10px] text-slate-400 tabular-nums">{s.skuId}{s.linked ? " ・ 記憶済み" : ""}</div>
                        </td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{s.qty.toLocaleString("ja-JP")}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{yen(s.amount)}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{s.orderCount.toLocaleString("ja-JP")}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums text-slate-400">{s.days}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                この対応（SKUひも付け）を記憶して次回以降を自動にする
              </label>
              <button
                type="button"
                onClick={onCommit}
                disabled={pending || checked.size === 0}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? "取り込み中…" : `選択SKU ${checked.size}件を取り込む`}
              </button>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
