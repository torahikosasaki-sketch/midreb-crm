"use client";

import { useState } from "react";

export type AccountWithProducts = {
  id: string;
  name: string;
  products: { id: string; name: string }[];
};

const selectCls = "rounded-md border border-slate-300 px-2 py-1.5 text-sm";

/**
 * 顧客(Account)選択 → 商材(Product)選択の連動プルダウン。
 * 同じ<form>内に name="accountId" / name="productId" で値を送信する。
 */
export function AccountProductPicker({
  accounts,
  defaultAccountId,
  defaultProductId,
  labelAccount = "顧客",
  labelProduct = "商材",
}: {
  accounts: AccountWithProducts[];
  defaultAccountId?: string | null;
  defaultProductId?: string | null;
  labelAccount?: string;
  labelProduct?: string;
}) {
  const [accountId, setAccountId] = useState(defaultAccountId ?? "");
  const products = accounts.find((a) => a.id === accountId)?.products ?? [];

  return (
    <>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-slate-500">{labelAccount}</span>
        <select
          name="accountId"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className={selectCls}
        >
          <option value="">—（未設定）</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        <span className="text-slate-500">{labelProduct}</span>
        <select
          key={accountId}
          name="productId"
          defaultValue={accountId === (defaultAccountId ?? "") ? defaultProductId ?? "" : ""}
          disabled={products.length === 0}
          className={selectCls}
        >
          <option value="">—</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
