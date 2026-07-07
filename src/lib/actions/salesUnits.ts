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
    brand: str(fd, "brand") ?? "(未設定)",
    productSku: str(fd, "productSku"),
    store: str(fd, "store"),
    weeklyTarget: num(fd, "weeklyTarget"),
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
