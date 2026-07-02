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

export async function createTalent(fd: FormData) {
  await prisma.talent.create({
    data: {
      name: str(fd, "name") ?? "(無名)",
      type: str(fd, "type"),
      partner: str(fd, "partner"),
      store: str(fd, "store"),
      memo: str(fd, "memo"),
    },
  });
  revalidatePath("/talents");
  redirect("/talents");
}

export async function deleteTalent(id: string) {
  await prisma.talent.delete({ where: { id } });
  revalidatePath("/talents");
  redirect("/talents");
}

/** 商談に人材をアサイン */
export async function assignTalent(dealId: string, fd: FormData) {
  const talentId = str(fd, "talentId");
  if (!talentId) return;
  await prisma.dealTalent.upsert({
    where: { dealId_talentId: { dealId, talentId } },
    create: { dealId, talentId },
    update: {},
  });
  revalidatePath(`/deals/${dealId}`);
}

/** アサイン解除 */
export async function unassignTalent(dealId: string, talentId: string) {
  await prisma.dealTalent.delete({
    where: { dealId_talentId: { dealId, talentId } },
  });
  revalidatePath(`/deals/${dealId}`);
}
