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

function date(fd: FormData, key: string): Date | null {
  const s = str(fd, key);
  return s ? new Date(s) : null;
}

function dealDataFromForm(fd: FormData) {
  return {
    accountId: str(fd, "accountId"),
    businessType: str(fd, "businessType") ?? "storeb",
    phase: str(fd, "phase") ?? "初回接触",
    probability: Number(str(fd, "probability") ?? "0"),
    inflowChannel: str(fd, "inflowChannel"),
    agencyName: str(fd, "agencyName"),
    owner: str(fd, "owner"),
    expectedCloseDate: date(fd, "expectedCloseDate"),
    nextActionDate: date(fd, "nextActionDate"),
    chatTool: str(fd, "chatTool"),
    channelName: str(fd, "channelName"),
    contractStatus: str(fd, "contractStatus"),
    contractType: str(fd, "contractType"),
    contractLink: str(fd, "contractLink"),
    memo: str(fd, "memo"),
  };
}

export async function createDeal(fd: FormData) {
  const data = dealDataFromForm(fd);
  const customerize = fd.get("customerize") === "1";
  // 末尾に並べる
  const max = await prisma.deal.aggregate({
    _max: { position: true },
    where: { phase: data.phase },
  });
  const deal = await prisma.deal.create({
    data: { ...data, customerized: customerize, position: (max._max.position ?? 0) + 1 },
  });
  revalidatePath("/");
  revalidatePath("/deals");
  revalidatePath("/accounts");
  redirect(`/deals/${deal.id}`);
}

export async function updateDeal(id: string, fd: FormData) {
  const data = dealDataFromForm(fd);
  const customerize = fd.get("customerize") === "1";
  // 顧客化は「はい」を選んだときだけ true にする（既存の顧客化状態は保持）
  await prisma.deal.update({
    where: { id },
    data: customerize ? { ...data, customerized: true } : data,
  });
  revalidatePath("/");
  revalidatePath("/deals");
  revalidatePath("/accounts");
  revalidatePath(`/deals/${id}`);
  redirect("/deals");
}

export async function deleteDeal(id: string) {
  await prisma.deal.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/deals");
  redirect("/deals");
}

/** カンバンのドラッグ移動。フェーズと並び順を更新 */
export async function moveDeal(id: string, phase: string, position: number) {
  await prisma.deal.update({ where: { id }, data: { phase, position } });
  revalidatePath("/");
  revalidatePath("/deals");
}
