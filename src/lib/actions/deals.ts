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
    phase: str(fd, "phase") ?? "初回商談予定",
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
  const leadId = str(fd, "leadId"); // 商談化/リード紐付け（任意）
  // 末尾に並べる
  const max = await prisma.deal.aggregate({
    _max: { position: true },
    where: { phase: data.phase },
  });
  const deal = await prisma.deal.create({
    data: {
      ...data,
      customerized: customerize,
      ...(leadId ? { leadId } : {}),
      position: (max._max.position ?? 0) + 1,
    },
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
  redirect("/"); // 商談カンバンに戻る
}

/** 一覧ビューのセル直接編集（Excelライク）。1フィールドだけ更新して保存 */
const INLINE_EDITABLE = new Set(["accountId", "businessType", "phase", "probability", "owner"]);
export async function updateDealField(
  id: string,
  field: string,
  value: string,
  customerize?: boolean
) {
  if (!INLINE_EDITABLE.has(field)) throw new Error(`編集不可のフィールド: ${field}`);

  const data: Record<string, unknown> = {};
  if (field === "probability") {
    const n = Number(value);
    data.probability = Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
  } else if (field === "accountId" || field === "owner") {
    data[field] = value === "" ? null : value;
  } else {
    data[field] = value;
  }
  // フェーズを契約締結済みにし「はい」を選んだ場合は顧客化
  if (field === "phase" && customerize) data.customerized = true;

  await prisma.deal.update({ where: { id }, data });
  revalidatePath("/");
  revalidatePath("/deals");
  revalidatePath("/accounts");
  revalidatePath(`/deals/${id}`);
}

export async function deleteDeal(id: string) {
  await prisma.deal.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/deals");
  revalidatePath("/accounts");
  redirect("/"); // 商談カンバンに戻る
}

/** カンバンのドラッグ移動。フェーズと並び順を更新 */
export async function moveDeal(id: string, phase: string, position: number) {
  await prisma.deal.update({ where: { id }, data: { phase, position } });
  revalidatePath("/");
  revalidatePath("/deals");
}
