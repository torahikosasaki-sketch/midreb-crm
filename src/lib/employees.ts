import { prisma } from "@/lib/prisma";

/** 担当者セレクト用: 稼働中の従業員名（＋現在値が非稼働でも欠落しないよう補完可能） */
export async function ownerOptions(includeName?: string | null): Promise<string[]> {
  const emps = await prisma.employee.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { name: true },
  });
  const names = emps.map((e) => e.name);
  if (includeName && !names.includes(includeName)) names.unshift(includeName);
  return names;
}
