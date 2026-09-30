"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  previewGlobalSkuImport,
  commitGlobalSkuImport,
  previewGlobalAdImport,
  commitGlobalAdImport,
  type GlobalSkuPreview,
  type GlobalAdPreview,
  type GlobalImportResult,
  type UnitOption,
} from "@/lib/actions/importProgress";

const yen = (n: number) => "¥" + n.toLocaleString("ja-JP");

/** CSVを文字コード自動判定で読む（UTF-8で置換文字が出たらShift-JISで再デコード） */
async function readTextAuto(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let text = new TextDecoder("utf-8").decode(buf);
  if (text.includes("�")) {
    try { text = new TextDecoder("shift_jis").decode(buf); } catch { /* keep utf-8 */ }
  }
  return text;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}
async function fileToBase64(file: File): Promise<string> {
  return bytesToBase64(new Uint8Array(await file.arrayBuffer()));
}

/** 販売単位の割当ドロップダウン（記憶済み=緑 / 候補=通常 / 未割当=アンバー） */
function UnitSelect({
  value,
  units,
  onChange,
  matchedBy,
}: {
  value: string;
  units: UnitOption[];
  onChange: (v: string) => void;
  matchedBy: "remembered" | "suggest" | null;
}) {
  const border = value ? (matchedBy === "remembered" ? "border-emerald-300 bg-emerald-50/50" : "border-slate-300") : "border-amber-300 bg-amber-50";
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`rounded-md border px-2 py-1 text-sm max-w-[15rem] ${border}`}>
      <option value="">未割当（スキップ）</option>
      {units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
    </select>
  );
}

function BulkAssign({ units, onPick }: { units: UnitOption[]; onPick: (unitId: string) => void }) {
  if (units.length === 0) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span>一括割当:</span>
      <select defaultValue="" onChange={(e) => { if (e.target.value) onPick(e.target.value); e.target.value = ""; }} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm">
        <option value="">すべて同じ販売単位に…</option>
        {units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
      </select>
    </div>
  );
}

// ── セラーCSV（実績）セクション ──────────────────────────────
function SellerImportSection() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<GlobalSkuPreview | null>(null);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [remember, setRemember] = useState(true);
  const [result, setResult] = useState<GlobalImportResult | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(""); setResult(null); setPreview(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await readTextAuto(file);
    setCsvText(text);
    startTransition(async () => {
      try {
        const p = await previewGlobalSkuImport(text);
        setPreview(p);
        const init: Record<string, string> = {};
        for (const r of p.rows) init[r.skuId] = r.suggestedUnitId ?? "";
        setAssign(init);
      } catch (err) { setError(err instanceof Error ? err.message : "プレビューに失敗しました。"); }
    });
  }

  function onCommit() {
    if (!preview) return;
    setError("");
    startTransition(async () => {
      try {
        const res = await commitGlobalSkuImport(csvText, assign, remember);
        setResult(res); setPreview(null); router.refresh();
      } catch (err) { setError(err instanceof Error ? err.message : "取り込みに失敗しました。"); }
    });
  }

  const mapped = preview ? preview.rows.filter((r) => assign[r.skuId]).length : 0;
  const auto = preview ? preview.rows.filter((r) => r.matchedBy === "remembered").length : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">⬆</div>
        <h2 className="font-semibold text-slate-900">セラーセンターCSV（実績）</h2>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        全商品混在のCSV（注文明細／商品パフォーマンスどちらも可・文字コード自動判定）を1回選ぶと、SKUごとに各販売単位へ振り分けて
        <strong> 売上個数・売上金額・注文数</strong>、および<strong> 動画/ライブの 投稿数・回数・販売・GMV（セラー経由）</strong>を反映します（後者は商品パフォーマンスCSVのみ。注文明細CSVでは変更しません）。記憶済みSKUは自動割当、未登録のみ選択してください。同一日付は上書きです。
      </p>
      <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={pending} className="text-sm" />
      {fileName && <span className="ml-2 text-xs text-slate-500">{fileName}</span>}
      {pending && <p className="mt-1 text-xs text-slate-400">処理中…</p>}
      {error && <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {result && (
        <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          取込完了: 日次実績 新規 {result.created} / 更新 {result.updated} 件（販売単位 {result.unitsTouched} 件・SKU {result.mappedCount} 件）
          {result.skippedCount > 0 && <span className="ml-1 text-amber-700">・未割当スキップ {result.skippedCount} 件</span>}
          {result.dateRange && <span className="ml-1 text-emerald-700">・{result.dateRange.min}{result.dateRange.min !== result.dateRange.max ? `〜${result.dateRange.max}` : ""}</span>}
        </div>
      )}

      {preview && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-600">
            <span>SKU <strong>{preview.rows.length}</strong> 件</span>
            {preview.dateRange && <span>対象日 <strong>{preview.dateRange.min}{preview.dateRange.min !== preview.dateRange.max ? `〜${preview.dateRange.max}` : ""}</strong></span>}
            <span>割当済み <strong className="text-emerald-700">{mapped}</strong> / {preview.rows.length}</span>
            {auto > 0 && <span className="text-emerald-700">自動割当 {auto} 件（記憶済み）</span>}
          </div>
          {preview.warnings.length > 0 && (
            <ul className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 list-disc list-inside">
              {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
          {preview.units.length === 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">販売単位が未登録です。先に案件進捗管理で追加してください。</p>
          ) : (
            <BulkAssign units={preview.units} onPick={(unitId) => setAssign(Object.fromEntries(preview.rows.map((r) => [r.skuId, unitId])))} />
          )}
          <div className="overflow-auto rounded-lg border border-slate-200 max-h-[26rem]">
            <table className="w-full text-sm bg-white">
              <thead className="sticky top-0">
                <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                  <th className="py-2 px-3 font-medium">商品名 / SKU ID</th>
                  <th className="py-2 px-3 font-medium text-right">売上個数</th>
                  <th className="py-2 px-3 font-medium text-right">売上金額</th>
                  <th className="py-2 px-3 font-medium text-right">注文数</th>
                  <th className="py-2 px-3 font-medium text-right">動画GMV</th>
                  <th className="py-2 px-3 font-medium text-right">ライブGMV</th>
                  <th className="py-2 px-3 font-medium">割り当てる販売単位</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.skuId} className={`border-b border-slate-100 ${assign[r.skuId] ? "" : "bg-amber-50/40"}`}>
                    <td className="py-1.5 px-3 max-w-[22rem]">
                      <div className="truncate" title={r.productName}>{r.productName}</div>
                      <div className="text-[10px] text-slate-400 tabular-nums">{r.skuId}{r.matchedBy === "remembered" ? " ・ 記憶済み" : r.matchedBy === "suggest" ? " ・ 候補" : ""}</div>
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{r.qty.toLocaleString("ja-JP")}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{yen(r.amount)}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{r.orderCount.toLocaleString("ja-JP")}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums text-slate-500">{r.videoGmv ? yen(r.videoGmv) : "—"}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums text-slate-500">{r.liveGmv ? yen(r.liveGmv) : "—"}</td>
                    <td className="py-1.5 px-3"><UnitSelect value={assign[r.skuId] ?? ""} units={preview.units} matchedBy={r.matchedBy} onChange={(v) => setAssign((p) => ({ ...p, [r.skuId]: v }))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              割当（SKUひも付け）を記憶して次回以降を自動にする
            </label>
            <button type="button" onClick={onCommit} disabled={pending || mapped === 0} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {pending ? "取り込み中…" : `${mapped} 件を取り込む`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ── 広告xlsx セクション ──────────────────────────────
function AdImportSection() {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [b64, setB64] = useState("");
  const [preview, setPreview] = useState<GlobalAdPreview | null>(null);
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [date, setDate] = useState("");
  const [remember, setRemember] = useState(true);
  const [result, setResult] = useState<GlobalImportResult | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(""); setResult(null); setPreview(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const data = await fileToBase64(file);
      setB64(data);
      startTransition(async () => {
        try {
          const p = await previewGlobalAdImport(data);
          setPreview(p);
          const init: Record<string, string> = {};
          for (const r of p.rows) init[r.campaignId] = r.suggestedUnitId ?? "";
          setAssign(init);
        } catch (err) { setError(err instanceof Error ? err.message : "プレビューに失敗しました。"); }
      });
    } catch (err) { setError(err instanceof Error ? err.message : "ファイルの読み込みに失敗しました。"); }
  }

  function onCommit() {
    if (!preview) return;
    if (!date) { setError("対象日を入力してください。"); return; }
    setError("");
    startTransition(async () => {
      try {
        const res = await commitGlobalAdImport(b64, assign, date, remember);
        setResult(res); setPreview(null); router.refresh();
      } catch (err) { setError(err instanceof Error ? err.message : "取り込みに失敗しました。"); }
    });
  }

  const mapped = preview ? preview.rows.filter((r) => assign[r.campaignId]).length : 0;
  const auto = preview ? preview.rows.filter((r) => r.matchedBy === "remembered").length : 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-8 w-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">⬆</div>
        <h2 className="font-semibold text-slate-900">広告データ（キャンペーンxlsx）</h2>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        広告アカウントの「Product campaign data」ファイル（.xlsx）を選び、<strong>対象日</strong>を指定すると、キャンペーンごとに各販売単位へ振り分けて
        <strong> 広告費・日予算・注文数・広告経由GMV </strong>を反映します。記憶済みキャンペーンは自動割当。（広告CSVに日付が無いため対象日は手動指定。同一日付は上書き）
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} disabled={pending} className="text-sm" />
        {fileName && <span className="text-xs text-slate-500">{fileName}</span>}
      </div>
      {pending && <p className="mt-1 text-xs text-slate-400">処理中…</p>}
      {error && <p className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      {result && (
        <div className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          取込完了（{result.dateRange?.min}）: 新規 {result.created} / 更新 {result.updated} 件（販売単位 {result.unitsTouched} 件・キャンペーン {result.mappedCount} 件）
          {result.skippedCount > 0 && <span className="ml-1 text-amber-700">・未割当スキップ {result.skippedCount} 件</span>}
        </div>
      )}

      {preview && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-slate-600 font-medium">対象日 *（この日付で登録）</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm w-40" />
            </label>
            <div className="text-xs text-slate-600">
              キャンペーン <strong>{preview.rows.length}</strong> 件・割当済み <strong className="text-emerald-700">{mapped}</strong>
              {auto > 0 && <span className="ml-2 text-emerald-700">自動割当 {auto} 件（記憶済み）</span>}
            </div>
          </div>
          {preview.warnings.length > 0 && (
            <ul className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 list-disc list-inside">
              {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          )}
          {preview.units.length > 0 && <BulkAssign units={preview.units} onPick={(unitId) => setAssign(Object.fromEntries(preview.rows.map((r) => [r.campaignId, unitId])))} />}
          <div className="overflow-auto rounded-lg border border-slate-200 max-h-[26rem]">
            <table className="w-full text-sm bg-white">
              <thead className="sticky top-0">
                <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                  <th className="py-2 px-3 font-medium">キャンペーン</th>
                  <th className="py-2 px-3 font-medium text-right">広告費</th>
                  <th className="py-2 px-3 font-medium text-right">広告経由GMV</th>
                  <th className="py-2 px-3 font-medium text-right">注文</th>
                  <th className="py-2 px-3 font-medium">割り当てる販売単位</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.campaignId} className={`border-b border-slate-100 ${assign[r.campaignId] ? "" : "bg-amber-50/40"}`}>
                    <td className="py-1.5 px-3 max-w-[22rem]">
                      <div className="truncate" title={r.campaignName}>{r.campaignName || "(名称なし)"}</div>
                      <div className="text-[10px] text-slate-400 tabular-nums">{r.campaignId}{r.matchedBy === "remembered" ? " ・ 記憶済み" : r.matchedBy === "suggest" ? " ・ 候補" : ""}</div>
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{yen(r.adSpend)}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{yen(r.adGmv)}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{r.orderCount.toLocaleString("ja-JP")}</td>
                    <td className="py-1.5 px-3"><UnitSelect value={assign[r.campaignId] ?? ""} units={preview.units} matchedBy={r.matchedBy} onChange={(v) => setAssign((p) => ({ ...p, [r.campaignId]: v }))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              割当（キャンペーンひも付け）を記憶して次回以降を自動にする
            </label>
            <button type="button" onClick={onCommit} disabled={pending || mapped === 0 || !date} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {pending ? "取り込み中…" : `${mapped} 件を ${date || "対象日"} に取り込む`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function ProgressImportPage() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-2">
        <Link href="/progress" className="text-sm text-emerald-600 hover:underline">← 案件進捗管理</Link>
      </div>
      <div className="flex items-center gap-3 mb-1">
        <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl">⬆</div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">CSV一括取込</h1>
          <p className="text-sm text-slate-500">1回のアップロードで、全販売単位へ自動振り分けします。</p>
        </div>
      </div>
      <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 my-4">
        初回は各SKU/キャンペーンに販売単位を割り当て、「記憶する」で保存すると、次回以降はアップロードするだけで自動割当されます。個別の販売単位ページを開く必要はありません。
      </p>
      <div className="space-y-5">
        <SellerImportSection />
        <AdImportSection />
      </div>
    </div>
  );
}
