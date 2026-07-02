import Link from "next/link";
import { createAccount } from "@/lib/actions/accounts";
import { AccountForm } from "@/components/AccountForm";

export const dynamic = "force-dynamic";

export default function NewAccountPage() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-4">
        <Link href="/accounts" className="text-sm text-sky-600 hover:underline">
          ← 顧客企業
        </Link>
        <h1 className="text-xl font-bold mt-1">顧客企業を追加</h1>
      </div>
      <AccountForm action={createAccount} submitLabel="作成" />
    </div>
  );
}
