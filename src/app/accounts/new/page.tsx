import Link from "next/link";
import { createAccount } from "@/lib/actions/accounts";
import { AccountForm } from "@/components/AccountForm";
import { ownerOptions } from "@/lib/employees";

export const dynamic = "force-dynamic";

export default async function NewAccountPage() {
  const owners = await ownerOptions();
  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-4">
        <Link href="/accounts" className="text-sm text-emerald-600 hover:underline">
          ← 顧客企業
        </Link>
        <h1 className="text-xl font-bold mt-1">顧客企業を追加</h1>
      </div>
      <AccountForm action={createAccount} owners={owners} submitLabel="作成" />
    </div>
  );
}
