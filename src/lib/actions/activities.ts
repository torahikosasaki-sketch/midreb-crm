"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export type ActivityTarget = { dealId?: string; leadId?: string };

function revalidateTarget(t: ActivityTarget) {
  if (t.dealId) revalidatePath(`/deals/${t.dealId}`);
  if (t.leadId) revalidatePath(`/leads/${t.leadId}`);
  revalidatePath("/accounts");
}

export async function createActivity(target: ActivityTarget, fd: FormData) {
  const occurred = str(fd, "occurredAt");
  await prisma.activity.create({
    data: {
      dealId: target.dealId ?? null,
      leadId: target.leadId ?? null,
      type: str(fd, "type") ?? "その他",
      content: str(fd, "content"),
      owner: str(fd, "owner"),
      occurredAt: occurred ? new Date(occurred) : new Date(),
    },
  });
  revalidateTarget(target);
}

export async function deleteActivity(id: string, target: ActivityTarget) {
  await prisma.activity.delete({ where: { id } });
  revalidateTarget(target);
}
