"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { weekStartOf } from "@/lib/period";

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

/** 週次実績を記録（同一販売単位×週があれば上書き＝upsert）。週開始日はレポートと同じ金曜起点にスナップする。 */
export async function createWeek(salesUnitId: string, fd: FormData) {
  const weekStartStr = str(fd, "weekStart");
  // 入力日を含む週の「金曜(UTC深夜)」に正規化（レポートの週定義と統一）
  const weekStart = weekStartOf(weekStartStr ? new Date(weekStartStr) : new Date());
  const data = {
    targetCount: num(fd, "targetCount"),
    videoPosts: num(fd, "videoPosts"),
    videoPosters: num(fd, "videoPosters"),
    videoSales: num(fd, "videoSales"),
    videoGmv: num(fd, "videoGmv"),
    liveCount: num(fd, "liveCount"),
    livePresenters: num(fd, "livePresenters"),
    liveSales: num(fd, "liveSales"),
    liveGmv: num(fd, "liveGmv"),
    activityNote: str(fd, "activityNote"),
  };
  await prisma.weeklyProgress.upsert({
    where: { salesUnitId_weekStart: { salesUnitId, weekStart } },
    create: { salesUnitId, weekStart, ...data },
    update: data,
  });
  revalidatePath(`/progress/${salesUnitId}`);
  revalidatePath("/progress");
}

export async function deleteWeek(id: string, salesUnitId: string) {
  await prisma.weeklyProgress.delete({ where: { id } });
  revalidatePath(`/progress/${salesUnitId}`);
  revalidatePath("/progress");
}
