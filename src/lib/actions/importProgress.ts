"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { aggregateSellerOrders, type ProductSummary } from "@/lib/sellerOrderImport";

const MAX_PRODUCTS = 2000;

export type UnitOption = { id: string; label: string; brand: string; productSku: string | null; accountName: string | null };

export type ProductPreview = ProductSummary & {
  suggestedUnitId: string | null;
  suggestedUnitLabel: string | null;
};

export type ProgressImportPreview = {
  products: ProductPreview[];
  units: UnitOption[];
  warnings: string[];
  totalRows: number;
  orderRows: number;
  dateRange: { min: string; max: string } | null;
};

/** 商品名から販売単位を推定（productSku完全一致 → brand完全一致 → 部分一致(一意のとき)） */
function suggestUnit(productKey: string, units: UnitOption[]): UnitOption | null {
  const key = productKey.trim();
  const bySku = units.find((u) => (u.productSku ?? "").trim() === key);
  if (bySku) return bySku;
  const byBrand = units.find((u) => u.brand.trim() === key);
  if (byBrand) return byBrand;
  // 部分一致（販売単位のSKU/ブランドがCSV商品名に含まれる。3文字以上・一意のときのみ）
  const contains = units.filter((u) => {
    const sku = (u.productSku ?? "").trim();
    const brand = u.brand.trim();
    return (sku.length >= 3 && key.includes(sku)) || (brand.length >= 3 && key.includes(brand));
  });
  return contains.length === 1 ? contains[0] : null;
}

/** CSVを解析し、商品ごとの集計＋販売単位の推定突合を返す。DBには書き込まない。 */
export async function previewProgressImport(csvText: string): Promise<ProgressImportPreview> {
  const agg = aggregateSellerOrders(csvText);

  const rawUnits = await prisma.salesUnit.findMany({
    select: { id: true, brand: true, productSku: true, account: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
  const units: UnitOption[] = rawUnits.map((u) => ({
    id: u.id,
    brand: u.brand,
    productSku: u.productSku,
    accountName: u.account?.name ?? null,
    label: `${u.productSku ?? u.brand}${u.account?.name ? `（${u.account.name}）` : ""}`,
  }));

  const products: ProductPreview[] = agg.products.slice(0, MAX_PRODUCTS).map((p) => {
    const s = suggestUnit(p.productKey, units);
    return { ...p, suggestedUnitId: s?.id ?? null, suggestedUnitLabel: s?.label ?? null };
  });

  const warnings = [...agg.warnings];
  if (agg.products.length > MAX_PRODUCTS) warnings.push(`商品数が上限(${MAX_PRODUCTS})を超えたため一部のみ表示しています。`);

  return { products, units, warnings, totalRows: agg.totalRows, orderRows: agg.orderRows, dateRange: agg.dateRange };
}

function toUtcMidnight(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export type ProgressImportResult = {
  created: number;
  updated: number;
  unitsTouched: number;
  mappedProducts: number;
  skippedProducts: number;
};

/**
 * 取込実行。assignments(商品名→販売単位ID) に従い、CSVを (販売単位×日付) に集約して
 * DailyReport を upsert。書き込むのは 売上個数(shippingQty)・売上金額(shippingAmount)・
 * 注文数(orderCount) の3項目のみ（動画/ライブ/広告など他項目は保持）。
 */
export async function commitProgressImport(
  csvText: string,
  assignments: Record<string, string>
): Promise<ProgressImportResult> {
  const agg = aggregateSellerOrders(csvText);

  // (unitId | date) → 集計
  const byUnitDay = new Map<string, { unitId: string; date: string; qty: number; amount: number; orders: number }>();
  const mappedProductKeys = new Set<string>();
  const allProductKeys = new Set<string>();

  for (const row of agg.perDay) {
    allProductKeys.add(row.productKey);
    const unitId = assignments[row.productKey];
    if (!unitId) continue; // 未割当の商品はスキップ
    mappedProductKeys.add(row.productKey);
    const key = `${unitId} ${row.reportDate}`;
    let b = byUnitDay.get(key);
    if (!b) { b = { unitId, date: row.reportDate, qty: 0, amount: 0, orders: 0 }; byUnitDay.set(key, b); }
    b.qty += row.qty;
    b.amount += row.amount;
    b.orders += row.orderCount;
  }

  let created = 0;
  let updated = 0;
  const touchedUnits = new Set<string>();

  for (const b of byUnitDay.values()) {
    const reportDate = toUtcMidnight(b.date);
    const data = { shippingQty: b.qty, shippingAmount: b.amount, orderCount: b.orders };
    const existing = await prisma.dailyReport.findUnique({
      where: { salesUnitId_reportDate: { salesUnitId: b.unitId, reportDate } },
      select: { id: true },
    });
    if (existing) {
      await prisma.dailyReport.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.dailyReport.create({ data: { salesUnitId: b.unitId, reportDate, ...data } });
      created++;
    }
    touchedUnits.add(b.unitId);
  }

  revalidatePath("/progress");
  revalidatePath("/reports/daily");
  for (const id of touchedUnits) {
    revalidatePath(`/progress/${id}`);
    revalidatePath(`/reports/daily/${id}`);
  }

  return {
    created,
    updated,
    unitsTouched: touchedUnits.size,
    mappedProducts: mappedProductKeys.size,
    skippedProducts: allProductKeys.size - mappedProductKeys.size,
  };
}
