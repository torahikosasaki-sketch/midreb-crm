import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createLead } from "@/lib/actions/leads";
import { LeadForm, type LeadInitial } from "@/components/LeadForm";
import { ownerOptions } from "@/lib/employees";

export const dynamic = "force-dynamic";

export default async function NewLeadPage({
  searchParams,
}: {
  searchParams: Promise<{ accountId?: string }>;
}) {
  const sp = await searchParams;
  const [accounts, owners] = await Promise.all([
    prisma.account.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ownerOptions(),
  ]);

  const initial: LeadInitial | undefined = sp.accountId
    ? { accountId: sp.accountId, source: null, status: "新規", owner: null, nextActionDate: null, memo: null }
    : undefined;

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-4">
        <Link href="/leads" className="text-sm text-emerald-600 hover:underline">
          ← リード
        </Link>
        <h1 className="text-xl font-bold mt-1">リードを追加</h1>
      </div>
      {accounts.length === 0 ? (
        <p className="text-sm text-slate-500">
          先に企業を登録してください。{" "}
          <Link href="/accounts/new" className="text-emerald-600 hover:underline">
            企業を追加
          </Link>
        </p>
      ) : (
        <LeadForm action={createLead} accounts={accounts} owners={owners} initial={initial} submitLabel="作成" />
      )}
    </div>
  );
}
