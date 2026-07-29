// CSVインポートの純粋ロジック（UI・DBから独立）。
// パース→列マッピング適用→行の正規化までを担う。外部ライブラリは使わない。

import {
  type SellerCenterMapping,
  type DailyMetricField,
} from "./importMappings";

/** 取り込み1行の正規化結果 */
export type ParsedDailyRow = {
  productKey: string; // 商品識別（商品名/SKU等の値）
  reportDate: string; // "YYYY-MM-DD"(UTC)
  metrics: Partial<Record<DailyMetricField, number>>;
  rowIndex: number; // 元CSVの行番号（1始まり・ヘッダ除く）
};

/**
 * RFC4180 準拠寄りの簡易CSVパーサ。引用符内のカンマ/改行/エスケープ("")に対応。
 * 先頭のBOMは除去する。戻り値は行×列の2次元配列。
 */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\r") {
        // 次が \n なら CRLF としてまとめて処理
        if (s[i + 1] === "\n") i++;
        row.push(field);
        rows.push(row);
        field = "";
        row = [];
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        field = "";
        row = [];
      } else {
        field += c;
      }
    }
  }
  // 末尾の未確定フィールド/行
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // 完全な空行を除去
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

/** "1,234"・"¥1,234"・"12.5%" などを数値へ。空/非数値は null */
export function normalizeNumber(raw: string | undefined): number | null {
  if (raw == null) return null;
  const cleaned = raw.replace(/[¥,%\s"]/g, "").replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** 各種日付書式を "YYYY-MM-DD" に正規化。失敗時は null */
export function normalizeDate(raw: string | undefined, format: SellerCenterMapping["dateFormat"]): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let y: number, m: number, d: number;
  if (format === "jp") {
    const mt = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (!mt) return null;
    [, y, m, d] = mt.map(Number) as unknown as [string, number, number, number];
  } else {
    // iso / slash: 区切りは - でも / でもよいので緩めにパース
    const mt = s.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
    if (!mt) return null;
    y = Number(mt[1]);
    m = Number(mt[2]);
    d = Number(mt[3]);
  }
  if (!y || !m || !d) return null;
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/** ヘッダ行からヘッダ名→列indexの辞書を作る */
function headerIndex(header: string[]): Map<string, number> {
  const map = new Map<string, number>();
  header.forEach((h, i) => map.set(h.trim(), i));
  return map;
}

/**
 * パース済みの行にマッピングを適用し、正規化済みの ParsedDailyRow[] と警告を返す。
 * DBには触れない。
 */
export function mapRows(
  rows: string[][],
  mapping: SellerCenterMapping
): { data: ParsedDailyRow[]; warnings: string[] } {
  const warnings: string[] = [];
  if (rows.length === 0) return { data: [], warnings: ["CSVが空です。"] };

  const header = rows[0];
  const idx = headerIndex(header);

  const dateCol = idx.get(mapping.dateHeader);
  if (dateCol == null) {
    warnings.push(`日付列「${mapping.dateHeader}」がCSVに見つかりません。列マッピング(importMappings.ts)を確認してください。`);
  }
  const productCols = mapping.productHeaders
    .map((h) => ({ h, col: idx.get(h) }))
    .filter((x) => x.col != null) as { h: string; col: number }[];
  if (productCols.length === 0) {
    warnings.push(`商品識別列（${mapping.productHeaders.join(" / ")}）がCSVに見つかりません。`);
  }
  const metricCols = Object.entries(mapping.metricHeaders)
    .map(([field, h]) => ({ field: field as DailyMetricField, col: idx.get(h as string) }))
    .filter((x) => x.col != null) as { field: DailyMetricField; col: number }[];

  const data: ParsedDailyRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const rowIndex = r; // ヘッダ除く1始まり

    const productKey =
      productCols.map((pc) => (cells[pc.col] ?? "").trim()).find((v) => v !== "") ?? "";
    const reportDate = dateCol == null ? null : normalizeDate(cells[dateCol], mapping.dateFormat);

    if (!productKey) {
      warnings.push(`${rowIndex}行目: 商品識別が空のためスキップ。`);
      continue;
    }
    if (!reportDate) {
      warnings.push(`${rowIndex}行目(${productKey}): 日付が不正のためスキップ。`);
      continue;
    }

    const metrics: Partial<Record<DailyMetricField, number>> = {};
    for (const mc of metricCols) {
      const n = normalizeNumber(cells[mc.col]);
      if (n != null) metrics[mc.field] = n;
    }
    data.push({ productKey, reportDate, metrics, rowIndex });
  }

  return { data, warnings };
}

/** 商品識別キーで販売単位を突合（productSku 完全一致 → brand 完全一致 の順） */
export function matchSalesUnit(
  productKey: string,
  units: { id: string; brand: string; productSku: string | null }[]
): { id: string; label: string } | null {
  const key = productKey.trim();
  const bySku = units.find((u) => (u.productSku ?? "").trim() === key);
  if (bySku) return { id: bySku.id, label: bySku.productSku ?? bySku.brand };
  const byBrand = units.find((u) => u.brand.trim() === key);
  if (byBrand) return { id: byBrand.id, label: byBrand.productSku ?? byBrand.brand };
  return null;
}
