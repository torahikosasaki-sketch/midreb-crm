"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
    accountId: str(fd, "accountId"),
    productId: str(fd, "productId"),
    brand: str(fd, "brand") ?? "(未設定)",
    productSku: str(fd, "productSku"),
    store: str(fd, "store"),
    weeklyTarget: num(fd, "weeklyTarget"),
    dailyAdBudget: num(fd, "dailyAdBudget"),
    status: str(fd, "status") ?? "稼働中",
    memo: str(fd, "memo"),
  };
}

export async function createSalesUnit(fd: FormData) {
  const unit = await prisma.salesUnit.create({ data: dataFromForm(fd) });
  revalidatePath("/progress");
  redirect(`/progress/${unit.id}`);
}

export async function updateSalesUnit(id: string, fd: FormData) {
  await prisma.salesUnit.update({ where: { id }, data: dataFromForm(fd) });
  revalidatePath("/progress");
  revalidatePath(`/progress/${id}`);
}

export async function deleteSalesUnit(id: string) {
  await prisma.salesUnit.delete({ where: { id } });
  revalidatePath("/progress");
  redirect("/progress");
}

/**
 * 販売単位に顧客（メーカー）を割り当てる。メーカー別レポートの「未分類」枠からの
 * クイック割当用。商材は顧客に属するため、顧客変更時は不整合を避けて商材をクリアする。
 * accountId が空文字なら未設定（null）に戻す。
 */
export async function assignUnitAccount(id: string, fd: FormData) {
  const accountId = str(fd, "accountId");
  await prisma.salesUnit.update({ where: { id }, data: { accountId, productId: null } });
  revalidatePath("/reports/brands");
  revalidatePath("/progress");
  revalidatePath(`/progress/${id}`);
}
