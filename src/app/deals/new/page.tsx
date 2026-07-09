import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createDeal } from "@/lib/actions/deals";
import { DealForm } from "@/components/DealForm";
import { ownerOptions } from "@/lib/employees";

export const dynamic = "force-dynamic";

export default async function NewDealPage() {
  const [accounts, owners] = await Promise.all([
    prisma.account.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ownerOptions(),
  ]);

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-4">
        <Link href="/deals" className="text-sm text-emerald-600 hover:underline">
          ← 商談一覧
        </Link>
        <h1 className="text-xl font-bold mt-1">商談を追加</h1>
      </div>
      <DealForm action={createDeal} accounts={accounts} owners={owners} submitLabel="作成" />
    </div>
  );
}
