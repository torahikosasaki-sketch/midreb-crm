"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BUSINESS_TYPES,
  PHASES,
  CONTRACT_STATUSES,
  CONTRACT_TYPES,
  PHASE_DEFAULT_PROBABILITY,
  formatYen,
  type Phase,
} from "@/lib/enums";
import { Field, TextInput, TextArea, Select, Button } from "@/components/ui";

type AccountOption = { id: string; name: string };

export type DealInitial = {
  accountId: string | null;
  businessType: string;
  phase: string;
  probability: number;
  services: string | null;
  expectedRevenue: number;
  inflowChannel: string | null;
  agencyName: string | null;
  owner: string | null;
  expectedCloseDate: string | null; // yyyy-mm-dd
  nextActionDate: string | null;
  chatTool: string | null;
  channelName: string | null;
  contractStatus: string | null;
  contractType: string | null;
  contractLink: string | null;
  memo: string | null;
};

export function DealForm({
  action,
  accounts,
  initial,
  submitLabel,
}: {
  action: (fd: FormData) => void | Promise<void>;
  accounts: AccountOption[];
  initial?: DealInitial;
  submitLabel: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>((initial?.phase as Phase) ?? "初回接触");
  const [probability, setProbability] = useState<number>(initial?.probability ?? 0.1);
  const [gmv, setGmv] = useState<number>(initial?.expectedRevenue ?? 0);

  const weighted = Math.round(gmv * probability);

  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
      <Field label="顧客企業">
        <select
          name="accountId"
          defaultValue={initial?.accountId ?? ""}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">—（未設定）</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="事業区分 *">
        <Select name="businessType" options={BUSINESS_TYPES} defaultValue={initial?.businessType ?? "storeb"} required />
      </Field>

      <Field label="フェーズ *">
        <Select
          name="phase"
          options={PHASES}
          value={phase}
          onChange={(e) => {
            const p = e.target.value as Phase;
            setPhase(p);
            setProbability(PHASE_DEFAULT_PROBABILITY[p]);
          }}
        />
      </Field>

      <Field label="確度 (0〜1)">
        <TextInput
          name="probability"
          type="number"
          step="0.05"
          min="0"
          max="1"
          value={probability}
          onChange={(e) => setProbability(Number(e.target.value))}
        />
      </Field>

      <Field label="想定売上 (円)">
        <TextInput
          name="expectedRevenue"
          type="number"
          min="0"
          value={gmv}
          onChange={(e) => setGmv(Number(e.target.value))}
        />
      </Field>

      <div className="flex flex-col gap-1 text-sm justify-end">
        <span className="text-slate-600 font-medium">加重売上（自動）</span>
        <div className="rounded-md bg-slate-100 px-3 py-2 font-semibold text-emerald-700 tabular-nums">
          {formatYen(weighted)}
        </div>
      </div>

      <Field label="提供サービス（カンマ区切り）">
        <TextInput name="services" defaultValue={initial?.services ?? ""} placeholder="TTS運用, 動画" />
      </Field>

      <Field label="流入経路">
        <TextInput name="inflowChannel" defaultValue={initial?.inflowChannel ?? ""} />
      </Field>

      <Field label="代理店名">
        <TextInput name="agencyName" defaultValue={initial?.agencyName ?? ""} />
      </Field>

      <Field label="担当者">
        <TextInput name="owner" defaultValue={initial?.owner ?? ""} />
      </Field>

      <Field label="受注予定日">
        <TextInput name="expectedCloseDate" type="date" defaultValue={initial?.expectedCloseDate ?? ""} />
      </Field>

      <Field label="次回アクション日">
        <TextInput name="nextActionDate" type="date" defaultValue={initial?.nextActionDate ?? ""} />
      </Field>

      <Field label="契約ステータス">
        <Select name="contractStatus" includeBlank options={CONTRACT_STATUSES} defaultValue={initial?.contractStatus ?? ""} />
      </Field>

      <Field label="契約種別">
        <Select name="contractType" includeBlank options={CONTRACT_TYPES} defaultValue={initial?.contractType ?? ""} />
      </Field>

      <Field label="チャットツール">
        <TextInput name="chatTool" defaultValue={initial?.chatTool ?? ""} />
      </Field>

      <Field label="チャンネル名">
        <TextInput name="channelName" defaultValue={initial?.channelName ?? ""} />
      </Field>

      <Field label="契約書リンク">
        <TextInput name="contractLink" defaultValue={initial?.contractLink ?? ""} />
      </Field>

      <div className="md:col-span-2">
        <Field label="メモ">
          <TextArea name="memo" rows={3} defaultValue={initial?.memo ?? ""} />
        </Field>
      </div>

      <div className="md:col-span-2 flex gap-2 pt-2">
        <Button type="submit">{submitLabel}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          キャンセル
        </Button>
      </div>
    </form>
  );
}
