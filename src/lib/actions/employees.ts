"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export async function createEmployee(fd: FormData) {
  await prisma.employee.create({
    data: {
      name: str(fd, "name") ?? "(無名)",
      email: str(fd, "email"),
      role: str(fd, "role"),
    },
  });
  revalidatePath("/settings");
}

export async function updateEmployee(id: string, fd: FormData) {
  await prisma.employee.update({
    where: { id },
    data: {
      name: str(fd, "name") ?? "(無名)",
      email: str(fd, "email"),
      role: str(fd, "role"),
    },
  });
  revalidatePath("/settings");
}

/** 稼働中/停止の切替 */
export async function toggleEmployee(id: string, active: boolean) {
  await prisma.employee.update({ where: { id }, data: { active } });
  revalidatePath("/settings");
}

export async function deleteEmployee(id: string) {
  await prisma.employee.delete({ where: { id } });
  revalidatePath("/settings");
}
