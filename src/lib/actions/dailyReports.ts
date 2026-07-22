"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
function num(fd: FormData, key: string): number | null {
  const s = str(fd, key);
  return s == null ? null : Math.round(Number(s));
}

/** 日次実績を記録（同一販売単位×日付があれば上書き＝upsert） */
export async function upsertDailyReport(salesUnitId: string, fd: FormData) {
  const reportDateStr = str(fd, "reportDate");
  const reportDate = new Date();
  if (reportDateStr) {
    // "YYYY-MM-DD" は UTC 深夜として解釈されるため setHours(local) は使わない
    reportDate.setTime(new Date(reportDateStr).getTime());
  } else {
    reportDate.setUTCHours(0, 0, 0, 0);
  }
  const data = {
    videoPosts: num(fd, "videoPosts"),
    liveCount: num(fd, "liveCount"),
    adSpend: num(fd, "adSpend"),
    adGmv: num(fd, "adGmv"),
    orderCount: num(fd, "orderCount"),
    dailyBudget: num(fd, "dailyBudget"),
    shippingQty: num(fd, "shippingQty"),
    shippingAmount: num(fd, "shippingAmount"),
    memo: str(fd, "memo"),
  };
  await prisma.dailyReport.upsert({
    where: { salesUnitId_reportDate: { salesUnitId, reportDate } },
    create: { salesUnitId, reportDate, ...data },
    update: data,
  });
  revalidatePath(`/reports/daily/${salesUnitId}`);
  revalidatePath("/reports/daily");
  revalidatePath(`/progress/${salesUnitId}`);
}

export async function deleteDailyReport(id: string, salesUnitId: string) {
  await prisma.dailyReport.delete({ where: { id } });
  revalidatePath(`/reports/daily/${salesUnitId}`);
  revalidatePath("/reports/daily");
  revalidatePath(`/progress/${salesUnitId}`);
}
