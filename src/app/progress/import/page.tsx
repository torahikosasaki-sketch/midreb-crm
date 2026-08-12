"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  previewProgressImport,
  commitProgressImport,
  type ProgressImportPreview,
  type ProgressImportResult,
} from "@/lib/actions/importProgress";

const yen = (n: number) => "¥" + n.toLocaleString("ja-JP");

export default function ProgressImportPage() {
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ProgressImportPreview | null>(null);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ProgressImportResult | null>(null);
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
        const p = await previewProgressImport(text);
        setPreview(p);
        // 推定突合を初期割当に
        const init: Record<string, string> = {};
        for (const pr of p.products) init[pr.productKey] = pr.suggestedUnitId ?? "";
        setAssign(init);
      } catch (err) {
        setError(err instanceof Error ? err.message : "プレビューに失敗しました。");
      }
    });
  }

  function setUnit(productKey: string, unitId: string) {
    setAssign((prev) => ({ ...prev, [productKey]: unitId }));
  }

  function applyToAll(unitId: string) {
    if (!preview) return;
    const next: Record<string, string> = {};
    for (const p of preview.products) next[p.productKey] = unitId;
    setAssign(next);
  }

  function onCommit() {
    if (!preview) return;
    setError("");
    startTransition(async () => {
      try {
        const res = await commitProgressImport(csvText, assign);
        setResult(res);
        setPreview(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "取り込みに失敗しました。");
      }
    });
  }

  const mappedCount = preview ? preview.products.filter((p) => assign[p.productKey]).length : 0;

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-1">
        <Link href="/progress" className="text-sm text-emerald-600 hover:underline">← 案件進捗管理</Link>
      </div>
      <h1 className="text-xl font-bold mb-1">セラーセンター注文明細の取り込み</h1>
      <p className="text-sm text-slate-500 mb-2">
        TikTok Seller Centerの「注文明細（注文詳細）」CSVを読み込み、商品×日付で集約して日次実績に反映します。
        取り込む数値は <strong>売上個数（数量）</strong>・<strong>売上金額（総売上高）</strong>・<strong>注文数</strong> の3項目です。
      </p>
      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 mb-5">
        ※ 動画/ライブのチャネル別実績はこのCSVに含まれないため変更されません（従来どおり手入力）。取り込み後の数値は
        各販売単位の日次実績フォームからいつでも手動で修正できます。同じ日付は上書きされます。
      </p>

      {/* ファイル選択 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-slate-700">CSVファイルを選択</span>
          <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={pending} className="text-sm" />
        </label>
        {fileName && <p className="mt-2 text-xs text-slate-500">選択中: {fileName}</p>}
        {pending && <p className="mt-2 text-xs text-slate-400">処理中…</p>}
      </div>

      {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 mb-4">{error}</p>}

      {result && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
          取り込み完了: 日次実績を 新規 {result.created} 件 / 更新 {result.updated} 件（販売単位 {result.unitsTouched} 件）。
          {result.skippedProducts > 0 && <span className="ml-1 text-amber-700">未割当のためスキップした商品 {result.skippedProducts} 件。</span>}
          <Link href="/progress" className="ml-2 underline">案件進捗管理へ →</Link>
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          {/* サマリ */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-600">
            <span>取り込み対象 <strong className="text-slate-800">{preview.orderRows}</strong> 行</span>
            <span>商品 <strong className="text-slate-800">{preview.products.length}</strong> 種</span>
            {preview.dateRange && <span>期間 <strong className="text-slate-800">{preview.dateRange.min} 〜 {preview.dateRange.max}</strong></span>}
            <span>割当済み <strong className="text-emerald-700">{mappedCount}</strong> / {preview.products.length}</span>
          </div>

          {preview.warnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <ul className="space-y-0.5 list-disc list-inside">
                {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {preview.units.length === 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              販売単位が登録されていません。先に<Link href="/progress" className="underline">案件進捗管理</Link>で販売単位を追加してください。
            </p>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>一括割当:</span>
              <select
                defaultValue=""
                onChange={(e) => { if (e.target.value) applyToAll(e.target.value); e.target.value = ""; }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
              >
                <option value="">すべての商品に販売単位を設定…</option>
                {preview.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
            </div>
          )}

          {/* 商品×販売単位の割当表 */}
          <div className="overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm bg-white">
              <thead>
                <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                  <th className="py-2 px-3 font-medium">商品名（CSV）</th>
                  <th className="py-2 px-3 font-medium text-right">売上個数</th>
                  <th className="py-2 px-3 font-medium text-right">売上金額</th>
                  <th className="py-2 px-3 font-medium text-right">注文数</th>
                  <th className="py-2 px-3 font-medium text-right">日数</th>
                  <th className="py-2 px-3 font-medium">割り当てる販売単位</th>
                </tr>
              </thead>
              <tbody>
                {preview.products.map((p) => {
                  const val = assign[p.productKey] ?? "";
                  return (
                    <tr key={p.productKey} className={`border-b border-slate-100 ${val ? "" : "bg-amber-50/40"}`}>
                      <td className="py-1.5 px-3 max-w-[22rem] truncate" title={p.productKey}>{p.productKey}</td>
                      <td className="py-1.5 px-3 text-right tabular-nums">{p.qty.toLocaleString("ja-JP")}</td>
                      <td className="py-1.5 px-3 text-right tabular-nums">{yen(p.amount)}</td>
                      <td className="py-1.5 px-3 text-right tabular-nums">{p.orderCount.toLocaleString("ja-JP")}</td>
                      <td className="py-1.5 px-3 text-right tabular-nums text-slate-400">{p.days}</td>
                      <td className="py-1.5 px-3">
                        <select
                          value={val}
                          onChange={(e) => setUnit(p.productKey, e.target.value)}
                          className={`rounded-md border px-2 py-1 text-sm max-w-[16rem] ${val ? "border-slate-300" : "border-amber-300 bg-amber-50"}`}
                        >
                          <option value="">未割当（スキップ）</option>
                          {preview.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-400">
              未割当（スキップ）の商品は取り込まれません。CSVの商品名と一致する販売単位が無い場合は、案件進捗管理で販売単位の「商品名/SKU」を合わせると次回から自動で候補表示されます。
            </p>
            <button
              type="button"
              onClick={onCommit}
              disabled={pending || mappedCount === 0}
              className="shrink-0 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? "取り込み中…" : `${mappedCount} 商品を取り込む`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
