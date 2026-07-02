"use client";

import { useRouter } from "next/navigation";
import {
  BUSINESS_TYPES,
  REGIONS,
  ACCOUNT_STATUSES,
} from "@/lib/enums";
import { Field, TextInput, Select, Button } from "@/components/ui";

export type AccountInitial = {
  name: string;
  businessType: string | null;
  targetTier: string | null;
  industry: string | null;
  region: string | null;
  owner: string | null;
  status: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  firstContactDate: string | null;
  salesTarget: number | null;
};

export function AccountForm({
  action,
  initial,
  submitLabel,
}: {
  action: (fd: FormData) => void | Promise<void>;
  initial?: AccountInitial;
  submitLabel: string;
}) {
  const router = useRouter();
  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
      <Field label="企業名 *">
        <TextInput name="name" required defaultValue={initial?.name ?? ""} />
      </Field>
      <Field label="事業区分">
        <Select name="businessType" includeBlank options={BUSINESS_TYPES} defaultValue={initial?.businessType ?? ""} />
      </Field>
      <Field label="業種">
        <TextInput name="industry" defaultValue={initial?.industry ?? ""} placeholder="美容・コスメ / アパレル …" />
      </Field>
      <Field label="ターゲット階層">
        <TextInput name="targetTier" defaultValue={initial?.targetTier ?? ""} />
      </Field>
      <Field label="国内/海外">
        <Select name="region" includeBlank options={REGIONS} defaultValue={initial?.region ?? ""} />
      </Field>
      <Field label="ステータス">
        <Select name="status" includeBlank options={ACCOUNT_STATUSES} defaultValue={initial?.status ?? ""} />
      </Field>
      <Field label="担当者">
        <TextInput name="owner" defaultValue={initial?.owner ?? ""} />
      </Field>
      <Field label="初回接触日">
        <TextInput name="firstContactDate" type="date" defaultValue={initial?.firstContactDate ?? ""} />
      </Field>
      <Field label="販売目標数">
        <TextInput name="salesTarget" type="number" min="0" defaultValue={initial?.salesTarget ?? ""} />
      </Field>
      <Field label="連絡先（担当者名）">
        <TextInput name="contactName" defaultValue={initial?.contactName ?? ""} />
      </Field>
      <Field label="メール">
        <TextInput name="email" type="email" defaultValue={initial?.email ?? ""} />
      </Field>
      <Field label="電話">
        <TextInput name="phone" defaultValue={initial?.phone ?? ""} />
      </Field>

      <div className="md:col-span-2 flex gap-2 pt-2">
        <Button type="submit">{submitLabel}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
