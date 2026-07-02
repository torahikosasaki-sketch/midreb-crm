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

function dataFromForm(fd: FormData) {
  return {
    brand: str(fd, "brand") ?? "(未設定)",
    productSku: str(fd, "productSku"),
    totalAssign: num(fd, "totalAssign"),
    totalSales: num(fd, "totalSales"),
    totalRevenue: num(fd, "totalRevenue"),
    videoPosts: num(fd, "videoPosts"),
    videoPosters: num(fd, "videoPosters"),
    videoSales: num(fd, "videoSales"),
    videoGmv: num(fd, "videoGmv"),
    liveCount: num(fd, "liveCount"),
    livePresenters: num(fd, "livePresenters"),
    liveSales: num(fd, "liveSales"),
    liveGmv: num(fd, "liveGmv"),
    partner: str(fd, "partner"),
    margin: (() => {
      const s = str(fd, "margin");
      return s == null ? null : Number(s);
    })(),
    store: str(fd, "store"),
    campaignName: str(fd, "campaignName"),
    startDate: (() => {
      const s = str(fd, "startDate");
      return s ? new Date(s) : null;
    })(),
    endDate: (() => {
      const s = str(fd, "endDate");
      return s ? new Date(s) : null;
    })(),
  };
}

export async function createCampaign(fd: FormData) {
  await prisma.campaign.create({ data: dataFromForm(fd) });
  revalidatePath("/campaigns");
}

export async function deleteCampaign(id: string) {
  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/campaigns");
}
