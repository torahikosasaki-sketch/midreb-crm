"use client";

import { useState, useTransition } from "react";
import {
  previewAdImport,
  commitAdImport,
  type AdImportPreview,
  type AdImportResult,
} from "@/lib/actions/importProgress";

const yen = (n: number) => "¥" + n.toLocaleString("ja-JP");

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result);
      const comma = s.indexOf(",");
      resolve(comma >= 0 ? s.slice(comma + 1) : s);
    };
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました。"));
    reader.readAsDataURL(file);
  });
}

export function UnitAdImport({ salesUnitId, storedCount }: { salesUnitId: string; storedCount: number }) {
  const [fileName, setFileName] = useState("");
  const [b64, setB64] = useState("");
  const [preview, setPreview] = useState<AdImportPreview | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [date, setDate] = useState("");
  const [remember, setRemember] = useState(true);
  const [result, setResult] = useState<AdImportResult | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setResult(null);
    setPreview(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const data = await fileToBase64(file);
      setB64(data);
      startTransition(async () => {
        try {
          const p = await previewAdImport(salesUnitId, data);
          setPreview(p);
          setChecked(new Set(p.campaigns.filter((c) => c.linked).map((c) => c.campaignId)));
        } catch (err) {
          setError(err instanceof Error ? err.message : "プレビューに失敗しました。");
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "ファイルの読み込みに失敗しました。");
    }
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onCommit() {
    if (!preview) return;
    if (!date) { setError("対象日を入力してください。"); return; }
    setError("");
    startTransition(async () => {
      try {
        const res = await commitAdImport(salesUnitId, b64, [...checked], date, remember);
        setResult(res);
        setPreview(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "取り込みに失敗しました。");
      }
    });
  }

  const totals = preview
    ? preview.campaigns.filter((c) => checked.has(c.campaignId)).reduce(
        (a, c) => ({ adSpend: a.adSpend + c.adSpend, dailyBudget: a.dailyBudget + c.dailyBudget, orderCount: a.orderCount + c.orderCount, adGmv: a.adGmv + c.adGmv }),
        { adSpend: 0, dailyBudget: 0, orderCount: 0, adGmv: 0 }
      )
    : null;

  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2">
        <span>⬆ 広告データ（キャンペーンCSV）から取り込む</span>
        {storedCount > 0 ? (
          <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">キャンペーンひも付け済み {storedCount}件</span>
        ) : (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">初回はキャンペーン選択が必要</span>
        )}
      </summary>

      <div className="border-t border-slate-100 p-4 space-y-3">
        <p className="text-xs text-slate-500">
          広告アカウントの「Product campaign data」ファイル（.xlsx）を選び、この販売単位のキャンペーンを選択して、
          <strong>対象日</strong>を指定して取り込みます。広告費・日予算・注文数・広告経由GMV に反映します
          （広告CSVには日付が無いため対象日は手動指定。同一日付は上書き。動画/ライブ実績は変更しません）。
        </p>

        <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} disabled={pending} className="text-sm" />
        {fileName && <span className="ml-2 text-xs text-slate-500">{fileName}</span>}
        {pending && <p className="text-xs text-slate-400">処理中…</p>}

        {error && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        {result && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            取り込み完了（{result.reportDate}・キャンペーン{result.campaignsUsed}件）: 広告費 {yen(result.totals.adSpend)} / 広告経由GMV {yen(result.totals.adGmv)} / 注文 {result.totals.orderCount} / 日予算 {yen(result.totals.dailyBudget)}。
            {result.remembered && <span className="ml-1 text-emerald-700">ひも付けを記憶しました。</span>}
          </div>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs">
                <span className="text-slate-600 font-medium">対象日 *（この日付で登録）</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm w-40" />
              </label>
              <div className="text-xs text-slate-500">
                検出キャンペーン <strong>{preview.campaigns.length}</strong> 件
                {preview.linkedCount > 0 && <span className="ml-2 text-emerald-700">記憶済み {preview.linkedCount}件を自動選択</span>}
              </div>
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
                    <th className="py-2 px-3 font-medium">キャンペーン</th>
                    <th className="py-2 px-3 font-medium text-right">広告費</th>
                    <th className="py-2 px-3 font-medium text-right">広告経由GMV</th>
                    <th className="py-2 px-3 font-medium text-right">注文数</th>
                    <th className="py-2 px-3 font-medium text-right">日予算</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.campaigns.map((c) => {
                    const on = checked.has(c.campaignId);
                    return (
                      <tr key={c.campaignId} className={`border-b border-slate-100 ${on ? "bg-emerald-50/40" : ""}`}>
                        <td className="py-1.5 px-3"><input type="checkbox" checked={on} onChange={() => toggle(c.campaignId)} /></td>
                        <td className="py-1.5 px-3 max-w-[24rem]">
                          <div className="truncate" title={c.campaignName}>{c.campaignName || "(名称なし)"}</div>
                          <div className="text-[10px] text-slate-400 tabular-nums">{c.campaignId}{c.linked ? " ・ 記憶済み" : ""}</div>
                        </td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{yen(c.adSpend)}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{yen(c.adGmv)}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{c.orderCount.toLocaleString("ja-JP")}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{yen(c.dailyBudget)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                {totals && checked.size > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200 font-medium">
                      <td className="py-2 px-3"></td>
                      <td className="py-2 px-3 text-slate-600">選択合計（{checked.size}件）</td>
                      <td className="py-2 px-3 text-right tabular-nums">{yen(totals.adSpend)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{yen(totals.adGmv)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{totals.orderCount.toLocaleString("ja-JP")}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{yen(totals.dailyBudget)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                この対応（キャンペーンひも付け）を記憶して次回以降を自動にする
              </label>
              <button
                type="button"
                onClick={onCommit}
                disabled={pending || checked.size === 0 || !date}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? "取り込み中…" : `選択${checked.size}件を ${date || "対象日"} に取り込む`}
              </button>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
