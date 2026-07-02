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

export async function createWeekly(fd: FormData) {
  await prisma.weeklyProgress.create({
    data: {
      brand: str(fd, "brand") ?? "(未設定)",
      productSku: str(fd, "productSku"),
      weekLabel: str(fd, "weekLabel") ?? "(週未設定)",
      targetCount: num(fd, "targetCount"),
      videoPosts: num(fd, "videoPosts"),
      videoPosters: num(fd, "videoPosters"),
      videoSales: num(fd, "videoSales"),
      videoGmv: num(fd, "videoGmv"),
      liveCount: num(fd, "liveCount"),
      livePresenters: num(fd, "livePresenters"),
      liveSales: num(fd, "liveSales"),
      liveGmv: num(fd, "liveGmv"),
      gapToTarget: num(fd, "gapToTarget"),
      activityNote: str(fd, "activityNote"),
    },
  });
  revalidatePath("/progress");
}

export async function deleteWeekly(id: string) {
  await prisma.weeklyProgress.delete({ where: { id } });
  revalidatePath("/progress");
}
