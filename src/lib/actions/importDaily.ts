"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseCsv, mapRows, matchSalesUnit, type ParsedDailyRow } from "@/lib/csvImport";
import { SELLER_CENTER_MAPPING, type DailyMetricField } from "@/lib/importMappings";

const MAX_ROWS = 5000; // 一度に取り込む行数の上限（安全策）

export type ImportPreviewRow = {
  rowIndex: number;
  productKey: string;
  reportDate: string;
  salesUnitId: string | null;
  unitLabel: string | null;
  metrics: Partial<Record<DailyMetricField, number>>;
};

export type ImportPreview = {
  rows: ImportPreviewRow[]; // マッチ済み（取り込み可能）
  unmatched: ImportPreviewRow[]; // 商品が販売単位に突合できなかった行
  warnings: string[];
  totalRows: number;
};

/** CSVテキストを解析し、取り込みプレビュー（マッチ状況・警告）を返す。DBには書き込まない。 */
export async function previewImport(csvText: string): Promise<ImportPreview> {
  const parsed = parseCsv(csvText);
  const { data, warnings } = mapRows(parsed, SELLER_CENTER_MAPPING);

  const units = await prisma.salesUnit.findMany({
    select: { id: true, brand: true, productSku: true },
  });

  const rows: ImportPreviewRow[] = [];
  const unmatched: ImportPreviewRow[] = [];
  for (const d of data.slice(0, MAX_ROWS)) {
    const m = matchSalesUnit(d.productKey, units);
    const pr: ImportPreviewRow = {
      rowIndex: d.rowIndex,
      productKey: d.productKey,
      reportDate: d.reportDate,
      salesUnitId: m?.id ?? null,
      unitLabel: m?.label ?? null,
      metrics: d.metrics,
    };
    if (m) rows.push(pr);
    else unmatched.push(pr);
  }

  if (data.length > MAX_ROWS) {
    warnings.push(`行数が上限(${MAX_ROWS})を超えたため、${MAX_ROWS}行までを対象にしました。`);
  }

  return { rows, unmatched, warnings, totalRows: data.length };
}

/** "YYYY-MM-DD" を UTC 深夜の Date へ */
function toUtcMidnight(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

/**
 * 取り込み実行。行ごとに DailyReport を upsert（salesUnitId×reportDate）。
 * metrics に含まれるフィールドのみ更新する（未指定は既存値を保持）。
 */
export async function commitImport(
  rows: { salesUnitId: string; reportDate: string; metrics: Partial<Record<DailyMetricField, number>> }[]
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;
  const touchedUnits = new Set<string>();

  for (const row of rows.slice(0, MAX_ROWS)) {
    const reportDate = toUtcMidnight(row.reportDate);
    const existing = await prisma.dailyReport.findUnique({
      where: { salesUnitId_reportDate: { salesUnitId: row.salesUnitId, reportDate } },
      select: { id: true },
    });
    if (existing) {
      await prisma.dailyReport.update({ where: { id: existing.id }, data: row.metrics });
      updated++;
    } else {
      await prisma.dailyReport.create({ data: { salesUnitId: row.salesUnitId, reportDate, ...row.metrics } });
      created++;
    }
    touchedUnits.add(row.salesUnitId);
  }

  revalidatePath("/reports/daily");
  for (const id of touchedUnits) {
    revalidatePath(`/reports/daily/${id}`);
    revalidatePath(`/progress/${id}`);
  }
  return { created, updated };
}

// 型再輸出（UI から利用）
export type { ParsedDailyRow };
