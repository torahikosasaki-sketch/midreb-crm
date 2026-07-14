"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/lib/enums";
import { Field, TextInput, TextArea, Select, Button } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

type AccountOption = { id: string; name: string };

export type LeadInitial = {
  accountId: string;
  source: string | null;
  status: string;
  owner: string | null;
  nextActionDate: string | null; // yyyy-mm-dd
  memo: string | null;
};

export function LeadForm({
  action,
  accounts,
  owners,
  initial,
  submitLabel,
}: {
  action: (fd: FormData) => void | Promise<void>;
  accounts: AccountOption[];
  owners: string[];
  initial?: LeadInitial;
  submitLabel: string;
}) {
  const router = useRouter();

  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
      <Field label="企業 *">
        <div className="flex items-center gap-2">
          <select
            name="accountId"
            required
            defaultValue={initial?.accountId ?? ""}
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="" disabled>
              企業を選択…
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <Link
            href="/accounts/new"
            className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            ＋新規企業
          </Link>
        </div>
      </Field>

      <Field label="リードソース／流入経路">
        <Select name="source" includeBlank options={LEAD_SOURCES} defaultValue={initial?.source ?? ""} />
      </Field>

      <Field label="ステータス *">
        <Select name="status" options={LEAD_STATUSES} defaultValue={initial?.status ?? "未接触"} />
      </Field>

      <Field label="担当（インサイドセールス）">
        <Select name="owner" includeBlank options={owners} defaultValue={initial?.owner ?? ""} />
      </Field>

      <Field label="次回アクション日">
        <TextInput name="nextActionDate" type="date" defaultValue={initial?.nextActionDate ?? ""} />
      </Field>

      <div className="md:col-span-2">
        <Field label="メモ">
          <TextArea name="memo" rows={3} defaultValue={initial?.memo ?? ""} />
        </Field>
      </div>

      <div className="md:col-span-2 flex gap-2 pt-2">
        <SubmitButton
          className="rounded-md px-4 py-2 text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700"
          pendingLabel="保存中…"
        >
          {submitLabel}
        </SubmitButton>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
