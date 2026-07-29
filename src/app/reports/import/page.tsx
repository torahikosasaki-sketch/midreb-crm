"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { previewImport, commitImport, type ImportPreview } from "@/lib/actions/importDaily";
import { METRIC_LABELS, type DailyMetricField } from "@/lib/importMappings";

const METRIC_ORDER: DailyMetricField[] = [
  "videoPosts",
  "liveCount",
  "adSpend",
  "adGmv",
  "orderCount",
  "shippingQty",
  "shippingAmount",
];

export default function ImportPage() {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number } | null>(null);
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
    startTransition(async () => {
      try {
        const p = await previewImport(text);
        setPreview(p);
      } catch (err) {
        setError(err instanceof Error ? err.message : "プレビューに失敗しました。");
      }
    });
  }

  function onCommit() {
    if (!preview || preview.rows.length === 0) return;
    setError("");
    startTransition(async () => {
      try {
        const rows = preview.rows.map((r) => ({
          salesUnitId: r.salesUnitId as string,
          reportDate: r.reportDate,
          metrics: r.metrics,
        }));
        const res = await commitImport(rows);
        setResult(res);
        setPreview(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "取り込みに失敗しました。");
      }
    });
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-1">
        <Link href="/reports" className="text-sm text-emerald-600 hover:underline">← レポート</Link>
      </div>
      <h1 className="text-xl font-bold mb-1">Seller Center CSV インポート</h1>
      <p className="text-sm text-slate-500 mb-2">
        セラーセンターから出力した商品別CSVを読み込み、日次実績（DailyReport）に反映します。取り込み前に必ずプレビューで内容を確認してください。
      </p>
      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-5">
        ※ CSVの列名・日付書式などの読み取り設定は現在<strong>暫定</strong>です（要件定義で確定予定）。列が一致しない場合は
        <code className="mx-1 rounded bg-white px-1">src/lib/importMappings.ts</code>
        の設定を実際のCSVに合わせて調整してください。
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
          取り込み完了: 新規 {result.created} 件 / 更新 {result.updated} 件。
          <Link href="/reports/daily" className="ml-2 underline">レポートを見る →</Link>
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          {/* 警告 */}
          {preview.warnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <div className="font-medium mb-1">警告 ({preview.warnings.length})</div>
              <ul className="space-y-0.5 list-disc list-inside">
                {preview.warnings.slice(0, 20).map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              取り込み対象 <strong className="text-emerald-700">{preview.rows.length}</strong> 行
              {preview.unmatched.length > 0 && (
                <span className="ml-2 text-rose-600">/ 未突合 {preview.unmatched.length} 行（スキップ）</span>
              )}
            </div>
            <button
              type="button"
              onClick={onCommit}
              disabled={pending || preview.rows.length === 0}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending ? "取り込み中…" : `${preview.rows.length}行を取り込む`}
            </button>
          </div>

          {/* プレビューテーブル */}
          <div className="overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm bg-white">
              <thead>
                <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                  <th className="py-2 px-3 font-medium">行</th>
                  <th className="py-2 px-3 font-medium">商品</th>
                  <th className="py-2 px-3 font-medium">販売単位</th>
                  <th className="py-2 px-3 font-medium">日付</th>
                  {METRIC_ORDER.map((m) => (
                    <th key={m} className="py-2 px-3 font-medium text-right">{METRIC_LABELS[m]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...preview.rows, ...preview.unmatched].slice(0, 200).map((r) => (
                  <tr key={`${r.rowIndex}-${r.productKey}`} className={`border-b border-slate-100 ${r.salesUnitId ? "" : "bg-rose-50/40"}`}>
                    <td className="py-1.5 px-3 text-slate-400 text-xs">{r.rowIndex}</td>
                    <td className="py-1.5 px-3">{r.productKey}</td>
                    <td className="py-1.5 px-3">
                      {r.unitLabel ?? <span className="text-rose-600 text-xs">未突合（スキップ）</span>}
                    </td>
                    <td className="py-1.5 px-3 tabular-nums">{r.reportDate}</td>
                    {METRIC_ORDER.map((m) => (
                      <td key={m} className="py-1.5 px-3 text-right tabular-nums">
                        {r.metrics[m] == null ? "—" : r.metrics[m]!.toLocaleString("ja-JP")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400">
            ※ 未突合の商品は取り込まれません。販売単位の「商品名/SKU」を実際のCSVの商品名と一致させると突合されます。
          </p>
        </div>
      )}
    </div>
  );
}
