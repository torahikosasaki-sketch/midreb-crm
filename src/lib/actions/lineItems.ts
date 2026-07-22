"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}
function num(fd: FormData, key: string): number {
  const s = str(fd, key);
  return s == null ? 0 : Math.round(Number(s));
}
function date(fd: FormData, key: string): Date | null {
  const s = str(fd, key);
  return s ? new Date(s) : null;
}

/** "YYYY-MM" (月入力) をその月1日のUTC深夜Dateへ */
function monthDate(fd: FormData, key: string): Date | null {
  const s = str(fd, key);
  return s ? new Date(`${s}-01T00:00:00.000Z`) : null;
}

function dataFromForm(fd: FormData) {
  const billingType = str(fd, "billingType") ?? "単発";
  const recurring = billingType === "月次定額";
  const status = recurring ? str(fd, "status") ?? "契約中" : "契約中";
  return {
    name: str(fd, "name") ?? "(品目)",
    productName: str(fd, "productName"),
    billingType,
    amount: num(fd, "amount"),
    quantity: Math.max(1, num(fd, "quantity") || 1),
    contractStart: recurring ? date(fd, "contractStart") : null,
    contractEnd: recurring ? date(fd, "contractEnd") : null,
    serviceMonth: recurring ? null : monthDate(fd, "serviceMonth"),
    status,
    churnDate: recurring && status === "解約" ? date(fd, "churnDate") ?? new Date() : null,
  };
}

export async function createLineItem(dealId: string, fd: FormData) {
  const max = await prisma.dealLineItem.aggregate({
    _max: { position: true },
    where: { dealId },
  });
  await prisma.dealLineItem.create({
    data: { dealId, ...dataFromForm(fd), position: (max._max.position ?? 0) + 1 },
  });
  revalidatePath(`/deals/${dealId}`);
}

export async function updateLineItem(id: string, dealId: string, fd: FormData) {
  await prisma.dealLineItem.update({ where: { id }, data: dataFromForm(fd) });
  revalidatePath(`/deals/${dealId}`);
}

export async function deleteLineItem(id: string, dealId: string) {
  await prisma.dealLineItem.delete({ where: { id } });
  revalidatePath(`/deals/${dealId}`);
}

/** 契約状態の切替（契約中⇄解約）。解約時は解約日を記録 */
export async function setLineStatus(id: string, dealId: string, status: string) {
  await prisma.dealLineItem.update({
    where: { id },
    data: { status, churnDate: status === "解約" ? new Date() : null },
  });
  revalidatePath(`/deals/${dealId}`);
}
