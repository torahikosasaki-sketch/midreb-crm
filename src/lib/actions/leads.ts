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

function leadDataFromForm(fd: FormData) {
  return {
    source: str(fd, "source"),
    status: str(fd, "status") ?? "未接触",
    owner: str(fd, "owner"),
    nextActionDate: date(fd, "nextActionDate"),
    memo: str(fd, "memo"),
  };
}

export async function createLead(fd: FormData) {
  const accountId = str(fd, "accountId");
  if (!accountId) throw new Error("リードには企業の選択が必須です");
  const lead = await prisma.lead.create({
    data: { accountId, ...leadDataFromForm(fd) },
  });
  revalidatePath("/leads");
  revalidatePath("/accounts");
  redirect(`/leads/${lead.id}`);
}

export async function updateLead(id: string, fd: FormData) {
  const accountId = str(fd, "accountId");
  if (!accountId) throw new Error("リードには企業の選択が必須です");
  await prisma.lead.update({
    where: { id },
    data: { accountId, ...leadDataFromForm(fd) },
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/accounts");
  redirect("/leads");
}

/** 一覧ビューのセル直接編集（Excelライク） */
const INLINE_EDITABLE = new Set(["accountId", "source", "status", "owner"]);
export async function updateLeadField(id: string, field: string, value: string) {
  if (!INLINE_EDITABLE.has(field)) throw new Error(`編集不可のフィールド: ${field}`);
  const data: Record<string, unknown> = {};
  if (field === "owner" || field === "source") {
    data[field] = value === "" ? null : value;
  } else {
    data[field] = value;
  }
  await prisma.lead.update({ where: { id }, data });
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/accounts");
}

export async function deleteLead(id: string) {
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/leads");
  revalidatePath("/accounts");
  redirect("/leads");
}

/** 商談化: リードから商談を1件生成し、リードを「商談化」にする */
export async function convertLeadToDeal(id: string) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: { deal: { select: { id: true } } },
  });
  if (!lead) throw new Error("リードが見つかりません");
  // 既に商談化済みなら既存商談へ
  if (lead.deal) redirect(`/deals/${lead.deal.id}`);

  const deal = await prisma.deal.create({
    data: {
      accountId: lead.accountId,
      leadId: lead.id,
      businessType: "storeb",
      phase: "初回商談予定",
      probability: 0.1,
      inflowChannel: lead.source,
      owner: lead.owner,
    },
  });
  await prisma.lead.update({ where: { id }, data: { status: "商談化" } });
  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  revalidatePath("/");
  revalidatePath("/deals");
  revalidatePath("/accounts");
  redirect(`/deals/${deal.id}`);
}
