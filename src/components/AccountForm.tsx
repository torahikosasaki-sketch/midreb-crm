"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BUSINESS_TYPES, REGIONS, ACCOUNT_STATUSES, bizTagClass } from "@/lib/enums";
import { Field, TextInput, Select, Button } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { LogoUpload } from "@/components/LogoUpload";

export type AccountInitial = {
  name: string;
  businessTypes: string[];
  logoUrl: string | null;
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
  owners,
  initial,
  submitLabel,
}: {
  action: (fd: FormData) => void | Promise<void>;
  owners: string[];
  initial?: AccountInitial;
  submitLabel: string;
}) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(initial?.businessTypes ?? []);

  const toggle = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <form action={action} className="max-w-3xl space-y-4">
      {/* ロゴ */}
      <Field label="顧客ロゴ">
        <LogoUpload initial={initial?.logoUrl ?? null} />
      </Field>

      {/* 事業タグ（複数） */}
      <div className="flex flex-col gap-1.5 text-sm">
        <span className="text-slate-600 font-medium">事業タグ（複数選択可）</span>
        <div className="flex flex-wrap gap-2">
          {BUSINESS_TYPES.map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggle(t)}
                className={`rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                  on
                    ? `${bizTagClass(t)} border-transparent ring-1 ring-emerald-400`
                    : "bg-white text-slate-500 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {on ? "✓ " : ""}
                {t}
              </button>
            );
          })}
        </div>
        {tags.map((t) => (
          <input key={t} type="hidden" name="businessTypes" value={t} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="企業名 *">
          <TextInput name="name" required defaultValue={initial?.name ?? ""} />
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
          <Select name="owner" includeBlank options={owners} defaultValue={initial?.owner ?? ""} />
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
      </div>

      <div className="flex gap-2 pt-2">
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
