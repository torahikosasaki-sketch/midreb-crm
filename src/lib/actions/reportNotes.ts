"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/** レポート手動サマリーの取得。無ければ空文字。 */
export async function getReportNote(scope: string, refId: string, periodKey: string): Promise<string> {
  const note = await prisma.reportNote.findUnique({
    where: { scope_refId_periodKey: { scope, refId, periodKey } },
  });
  return note?.body ?? "";
}

/** レポート手動サマリーの保存（空なら削除）。scope×refId×periodKey で upsert。 */
export async function upsertReportNote(
  scope: string,
  refId: string,
  periodKey: string,
  body: string
): Promise<void> {
  const trimmed = body.trim();
  if (trimmed === "") {
    await prisma.reportNote.deleteMany({ where: { scope, refId, periodKey } });
  } else {
    await prisma.reportNote.upsert({
      where: { scope_refId_periodKey: { scope, refId, periodKey } },
      create: { scope, refId, periodKey, body: trimmed },
      update: { body: trimmed },
    });
  }
  revalidatePath("/reports/daily");
  if (scope === "unit") revalidatePath(`/reports/daily/${refId}`);
  if (scope === "account") revalidatePath(`/reports/brands/${refId}`);
}
