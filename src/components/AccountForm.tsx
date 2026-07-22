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
  products: string[];
  logoUrl: string | null;
  industry: string | null;
  region: string | null;
  owner: string | null;
  status: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
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
  const [products, setProducts] = useState<string[]>(initial?.products ?? []);
  const [productInput, setProductInput] = useState("");

  const toggle = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  function addProduct() {
    const v = productInput.trim();
    if (v && !products.includes(v)) setProducts((prev) => [...prev, v]);
    setProductInput("");
  }
  function removeProduct(p: string) {
    setProducts((prev) => prev.filter((x) => x !== p));
  }

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

      {/* 商材（複数入力） */}
      <div className="flex flex-col gap-1.5 text-sm">
        <span className="text-slate-600 font-medium">商材（複数入力可）</span>
        {products.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {products.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1 rounded-full bg-teal-100 text-teal-700 px-3 py-1 text-sm font-medium"
              >
                {p}
                <button
                  type="button"
                  onClick={() => removeProduct(p)}
                  className="text-teal-500 hover:text-rose-600"
                  aria-label={`${p}を削除`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            value={productInput}
            onChange={(e) => setProductInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addProduct();
              }
            }}
            placeholder="商材名を入力してEnterまたは追加"
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          <Button type="button" variant="ghost" onClick={addProduct}>
            ＋ 追加
          </Button>
        </div>
        {products.map((p) => (
          <input key={p} type="hidden" name="products" value={p} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="企業名 *">
          <TextInput name="name" required defaultValue={initial?.name ?? ""} />
        </Field>
        <Field label="業種">
          <TextInput name="industry" defaultValue={initial?.industry ?? ""} placeholder="美容・コスメ / アパレル …" />
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
