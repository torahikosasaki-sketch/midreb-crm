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

const BIZ_SET = new Set([
  "storeb",
  "TTS導入・運用支援",
  "越境支援",
  "他社動画・ライブ支援",
  "コンサル",
]);

function accountDataFromForm(fd: FormData) {
  // 事業タグ（固定セットのみ許可・重複排除）
  const businessTypes = [...new Set(fd.getAll("businessTypes").map(String))].filter((t) =>
    BIZ_SET.has(t)
  );
  // ロゴ: データURI or 空(削除)。50万文字(≈数百KB)を上限にガード
  const logo = str(fd, "logoUrl");
  const logoUrl = logo && logo.startsWith("data:image/") && logo.length < 500000 ? logo : logo ? undefined : null;

  return {
    name: str(fd, "name") ?? "(無名)",
    businessTypes,
    ...(logoUrl === undefined ? {} : { logoUrl }),
    industry: str(fd, "industry"),
    region: str(fd, "region"),
    owner: str(fd, "owner"),
    status: str(fd, "status"),
    contactName: str(fd, "contactName"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    // firstContactDate / contractDate はフォームでは編集不可（リード/商談のステータス変化で自動設定）
  };
}

/** フォームの商材名（自由入力・重複排除・空文字除外）を Product 子レコードへ同期 */
async function syncProducts(accountId: string, fd: FormData) {
  const names = [...new Set(fd.getAll("products").map((v) => String(v).trim()))].filter(Boolean);
  await prisma.product.deleteMany({ where: { accountId, name: { notIn: names } } });
  for (const name of names) {
    await prisma.product.upsert({
      where: { accountId_name: { accountId, name } },
      create: { accountId, name },
      update: {},
    });
  }
}

export async function createAccount(fd: FormData) {
  const account = await prisma.account.create({ data: accountDataFromForm(fd) });
  await syncProducts(account.id, fd);
  revalidatePath("/accounts");
  redirect(`/accounts/${account.id}`);
}

export async function updateAccount(id: string, fd: FormData) {
  await prisma.account.update({ where: { id }, data: accountDataFromForm(fd) });
  await syncProducts(id, fd);
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${id}`);
  redirect("/accounts");
}

export async function deleteAccount(id: string) {
  await prisma.account.delete({ where: { id } });
  revalidatePath("/accounts");
  redirect("/accounts");
}
