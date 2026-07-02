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

function accountDataFromForm(fd: FormData) {
  return {
    name: str(fd, "name") ?? "(無名)",
    businessType: str(fd, "businessType"),
    targetTier: str(fd, "targetTier"),
    industry: str(fd, "industry"),
    region: str(fd, "region"),
    owner: str(fd, "owner"),
    status: str(fd, "status"),
    contactName: str(fd, "contactName"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    firstContactDate: (() => {
      const s = str(fd, "firstContactDate");
      return s ? new Date(s) : null;
    })(),
    salesTarget: (() => {
      const s = str(fd, "salesTarget");
      return s == null ? null : Number(s);
    })(),
  };
}

export async function createAccount(fd: FormData) {
  const account = await prisma.account.create({ data: accountDataFromForm(fd) });
  revalidatePath("/accounts");
  redirect(`/accounts/${account.id}`);
}

export async function updateAccount(id: string, fd: FormData) {
  await prisma.account.update({ where: { id }, data: accountDataFromForm(fd) });
  revalidatePath("/accounts");
  revalidatePath(`/accounts/${id}`);
  redirect(`/accounts/${id}`);
}

export async function deleteAccount(id: string) {
  await prisma.account.delete({ where: { id } });
  revalidatePath("/accounts");
  redirect("/accounts");
}
