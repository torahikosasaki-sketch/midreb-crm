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
  return s == null ? null : Number(s);
}

function dataFromForm(fd: FormData) {
  return {
    label: str(fd, "label") ?? "(無題)",
    monthlyGmvTarget: num(fd, "monthlyGmvTarget"),
    sellerTarget: num(fd, "sellerTarget"),
    creatorTarget: num(fd, "creatorTarget"),
    productionTarget: num(fd, "productionTarget"),
  };
}

export async function createTarget(fd: FormData) {
  await prisma.target.create({ data: dataFromForm(fd) });
  revalidatePath("/targets");
}

export async function updateTarget(id: string, fd: FormData) {
  await prisma.target.update({ where: { id }, data: dataFromForm(fd) });
  revalidatePath("/targets");
}

export async function deleteTarget(id: string) {
  await prisma.target.delete({ where: { id } });
  revalidatePath("/targets");
}
