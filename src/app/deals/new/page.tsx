import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createDeal } from "@/lib/actions/deals";
import { DealForm, type DealInitial } from "@/components/DealForm";
import { ownerOptions } from "@/lib/employees";

export const dynamic = "force-dynamic";

export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string; leadId?: string }>;
}) {
  const sp = await searchParams;
  const [accounts, owners] = await Promise.all([
    prisma.account.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ownerOptions(),
  ]);

  // 企業から直接作成する場合は accountId を初期選択
  const initial: DealInitial | undefined = sp.accountId
    ? {
        accountId: sp.accountId,
        businessType: "storeb",
        phase: "初回商談予定",
        probability: 0.1,
        inflowChannel: null,
        agencyName: null,
        owner: null,
        expectedCloseDate: null,
        nextActionDate: null,
        chatTool: null,
        channelName: null,
        contractStatus: null,
        contractType: null,
        contractLink: null,
        memo: null,
      }
    : undefined;

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-4">
        <Link href="/deals" className="text-sm text-emerald-600 hover:underline">
          ← 商談一覧
        </Link>
        <h1 className="text-xl font-bold mt-1">商談を追加</h1>
      </div>
      <DealForm
        action={createDeal}
        accounts={accounts}
        owners={owners}
        initial={initial}
        leadId={sp.leadId}
        submitLabel="作成"
      />
    </div>
  );
}
