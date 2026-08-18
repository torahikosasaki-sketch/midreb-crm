// TikTok Seller Center「注文明細（注文詳細）」CSV → 日次実績への集約（純粋ロジック）。
// 1行=1注文の1SKU。これを集約して 売上個数・売上金額・注文数 を出す。
// 集約キーは2通り: 商品名（グローバル取込UI用）と SKU ID（商品ページ内取込・記憶用）。
// 列名などの取り込み設定はここ（SELLER_ORDER_MAPPING）に集約し、フォーマット変更時はここだけ直す。

import { parseCsv, normalizeNumber, normalizeDate } from "./csvImport";

export const SELLER_ORDER_MAPPING = {
  /** 取り込み対象を「注文」に限定するための取引タイプ列と値（返金・調整は除外） */
  txnTypeHeader: "取引タイプ",
  orderTxnValue: "注文",
  /** 売上日として使う列（優先）。空/不正なら fallbackDateHeader を使う。
   *  会議決定: 売上が発生した日＝「明細の日付」を採用（従来の注文作成日はフォールバック）。 */
  dateHeader: "明細の日付",
  fallbackDateHeader: "注文作成日",
  dateFormat: "slash" as const, // 2026/01/26 形式
  /** 商品識別列（人が読む表示・グローバル取込の突合キー） */
  productHeader: "商品名",
  /** SKU識別列（安定キー。商品ページ内取込の記憶に使う） */
  skuIdHeader: "SKU ID",
  /** 数量（売上個数） */
  qtyHeader: "数量",
  /** 金額（売上金額 / GMV）: 総売上高を使う */
  amountHeader: "総売上高",
  /** 注文数カウント用（同一注文の複数SKU行を1注文として数える） */
  orderIdHeader: "注文/調整ID",
};

/** 注文明細の1行を正規化したもの */
export type ParsedOrderRow = {
  skuId: string;
  productName: string;
  date: string; // YYYY-MM-DD
  qty: number;
  amount: number;
  orderId: string;
};

export type ParseResult = {
  rows: ParsedOrderRow[];
  warnings: string[];
  totalRows: number; // ヘッダを除くデータ行数
  orderRows: number; // 取り込み対象（取引タイプ=注文）の行数
};

function headerIndex(header: string[]): Map<string, number> {
  const m = new Map<string, number>();
  header.forEach((h, i) => {
    const key = h.trim();
    if (key && !m.has(key)) m.set(key, i);
  });
  return m;
}

/** CSVテキストを1行=1明細に正規化。取引タイプ=注文のみ。DBには触れない。 */
export function parseSellerOrderRows(csvText: string): ParseResult {
  const rows = parseCsv(csvText);
  const warnings: string[] = [];
  if (rows.length < 2) {
    return { rows: [], warnings: ["CSVにデータ行がありません。"], totalRows: 0, orderRows: 0 };
  }

  const M = SELLER_ORDER_MAPPING;
  const idx = headerIndex(rows[0]);
  const col = (name: string) => idx.get(name);

  const productCol = col(M.productHeader);
  const skuCol = col(M.skuIdHeader);
  const qtyCol = col(M.qtyHeader);
  const amountCol = col(M.amountHeader);
  const dateCol = col(M.dateHeader);
  const fbDateCol = col(M.fallbackDateHeader);
  const orderIdCol = col(M.orderIdHeader);
  const txnCol = col(M.txnTypeHeader);

  const missing: string[] = [];
  if (productCol == null) missing.push(M.productHeader);
  if (qtyCol == null) missing.push(M.qtyHeader);
  if (amountCol == null) missing.push(M.amountHeader);
  if (dateCol == null && fbDateCol == null) missing.push(`${M.dateHeader} / ${M.fallbackDateHeader}`);
  if (missing.length > 0) {
    warnings.push(`必要な列が見つかりません: ${missing.join(", ")}（sellerOrderImport.ts の列設定を確認してください）`);
    return { rows: [], warnings, totalRows: rows.length - 1, orderRows: 0 };
  }

  const out: ParsedOrderRow[] = [];
  let orderRows = 0;
  let skippedNoDate = 0;
  let skippedNoProduct = 0;

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    if (txnCol != null) {
      const t = (cells[txnCol] ?? "").trim();
      if (t && t !== M.orderTxnValue) continue;
    }
    const productName = (cells[productCol!] ?? "").trim();
    if (!productName) { skippedNoProduct++; continue; }
    const date =
      (dateCol != null ? normalizeDate(cells[dateCol], M.dateFormat) : null) ??
      (fbDateCol != null ? normalizeDate(cells[fbDateCol], M.dateFormat) : null);
    if (!date) { skippedNoDate++; continue; }

    orderRows++;
    out.push({
      skuId: skuCol != null ? (cells[skuCol] ?? "").trim() : "",
      productName,
      date,
      qty: normalizeNumber(cells[qtyCol!]) ?? 0,
      amount: normalizeNumber(cells[amountCol!]) ?? 0,
      orderId: orderIdCol != null ? (cells[orderIdCol] ?? "").trim() : "",
    });
  }

  if (skippedNoProduct > 0) warnings.push(`商品名が空の行を ${skippedNoProduct} 件スキップしました。`);
  if (skippedNoDate > 0) warnings.push(`日付が不正な行を ${skippedNoDate} 件スキップしました。`);

  return { rows: out, warnings, totalRows: rows.length - 1, orderRows };
}

function dateRangeOf(dates: string[]): { min: string; max: string } | null {
  if (dates.length === 0) return null;
  const s = [...dates].sort();
  return { min: s[0], max: s[s.length - 1] };
}

// ── 商品名キーの集約（グローバル取込UI用） ─────────────────────────

export type AggregatedRow = { productKey: string; reportDate: string; qty: number; amount: number; orderCount: number };
export type ProductSummary = { productKey: string; qty: number; amount: number; orderCount: number; days: number };
export type SellerAggResult = {
  perDay: AggregatedRow[];
  products: ProductSummary[];
  warnings: string[];
  totalRows: number;
  orderRows: number;
  dateRange: { min: string; max: string } | null;
};

/** 商品名 × 日付 で集約する。 */
export function aggregateSellerOrders(csvText: string): SellerAggResult {
  const p = parseSellerOrderRows(csvText);
  const map = new Map<string, { productKey: string; date: string; qty: number; amount: number; orders: Set<string> }>();
  for (const row of p.rows) {
    const key = `${row.productName} ${row.date}`;
    let b = map.get(key);
    if (!b) { b = { productKey: row.productName, date: row.date, qty: 0, amount: 0, orders: new Set() }; map.set(key, b); }
    b.qty += row.qty; b.amount += row.amount;
    if (row.orderId) b.orders.add(row.orderId);
  }
  const perDay: AggregatedRow[] = [...map.values()].map((b) => ({ productKey: b.productKey, reportDate: b.date, qty: b.qty, amount: b.amount, orderCount: b.orders.size }));

  const pmap = new Map<string, ProductSummary>();
  for (const d of perDay) {
    let x = pmap.get(d.productKey);
    if (!x) { x = { productKey: d.productKey, qty: 0, amount: 0, orderCount: 0, days: 0 }; pmap.set(d.productKey, x); }
    x.qty += d.qty; x.amount += d.amount; x.orderCount += d.orderCount; x.days += 1;
  }
  const products = [...pmap.values()].sort((a, b) => b.amount - a.amount);
  return { perDay, products, warnings: p.warnings, totalRows: p.totalRows, orderRows: p.orderRows, dateRange: dateRangeOf(perDay.map((d) => d.reportDate)) };
}

// ── SKU IDキーの集約（商品ページ内取込・記憶用） ──────────────────

export type SkuSummary = { skuId: string; productName: string; qty: number; amount: number; orderCount: number; days: number };
export type SkuDayRow = { skuId: string; reportDate: string; qty: number; amount: number; orderCount: number };
export type SellerSkuAggResult = {
  skus: SkuSummary[];
  perSkuDay: SkuDayRow[];
  warnings: string[];
  totalRows: number;
  orderRows: number;
  dateRange: { min: string; max: string } | null;
};

/** SKU ID × 日付 で集約する。SKU IDが空の行は productName をキーに代用する。 */
export function aggregateSellerOrdersBySku(csvText: string): SellerSkuAggResult {
  const p = parseSellerOrderRows(csvText);
  const keyOf = (r: ParsedOrderRow) => r.skuId || `name:${r.productName}`;

  const map = new Map<string, { skuId: string; productName: string; date: string; qty: number; amount: number; orders: Set<string> }>();
  for (const row of p.rows) {
    const key = `${keyOf(row)} ${row.date}`;
    let b = map.get(key);
    if (!b) { b = { skuId: keyOf(row), productName: row.productName, date: row.date, qty: 0, amount: 0, orders: new Set() }; map.set(key, b); }
    b.qty += row.qty; b.amount += row.amount;
    if (row.orderId) b.orders.add(row.orderId);
  }
  const perSkuDay: SkuDayRow[] = [...map.values()].map((b) => ({ skuId: b.skuId, reportDate: b.date, qty: b.qty, amount: b.amount, orderCount: b.orders.size }));

  const smap = new Map<string, SkuSummary>();
  for (const b of map.values()) {
    let x = smap.get(b.skuId);
    if (!x) { x = { skuId: b.skuId, productName: b.productName, qty: 0, amount: 0, orderCount: 0, days: 0 }; smap.set(b.skuId, x); }
    x.qty += b.qty; x.amount += b.amount; x.orderCount += b.orders.size; x.days += 1;
  }
  const skus = [...smap.values()].sort((a, b) => b.amount - a.amount);
  return { skus, perSkuDay, warnings: p.warnings, totalRows: p.totalRows, orderRows: p.orderRows, dateRange: dateRangeOf(perSkuDay.map((d) => d.reportDate)) };
}
