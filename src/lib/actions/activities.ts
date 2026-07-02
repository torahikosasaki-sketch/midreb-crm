"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function createActivity(dealId: string, fd: FormData) {
  const occurred = str(fd, "occurredAt");
  await prisma.activity.create({
    data: {
      dealId,
      type: str(fd, "type") ?? "その他",
      content: str(fd, "content"),
      owner: str(fd, "owner"),
      occurredAt: occurred ? new Date(occurred) : new Date(),
    },
  });
  revalidatePath(`/deals/${dealId}`);
}

export async function deleteActivity(id: string, dealId: string) {
  await prisma.activity.delete({ where: { id } });
  revalidatePath(`/deals/${dealId}`);
}
