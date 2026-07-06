"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { BUSINESS_TYPES, PHASES } from "@/lib/enums";

export function Filters({ owners, showPhase = false }: { owners: string[]; showPhase?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const isList = pathname.startsWith("/deals");
  const toggleBase = "rounded-md px-2.5 py-1 text-sm font-medium transition-colors";
  const active = "bg-emerald-600 text-white";
  const inactive = "text-slate-600 hover:bg-slate-100";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  }

  const selectCls =
    "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500";

  const hasFilter =
    params.get("businessType") || params.get("owner") || params.get("phase");

  return (
    <div className="flex items-center gap-2 px-6 py-2 border-b border-slate-200 bg-white text-sm">
      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 mr-1">
        <Link href="/" className={`${toggleBase} ${!isList ? active : inactive}`}>
          カンバン
        </Link>
        <Link href="/deals" className={`${toggleBase} ${isList ? active : inactive}`}>
          一覧
        </Link>
      </div>
      <span className="text-slate-500">フィルタ:</span>
      <select
        className={selectCls}
        value={params.get("businessType") ?? ""}
        onChange={(e) => setParam("businessType", e.target.value)}
      >
        <option value="">事業区分（すべて）</option>
        {BUSINESS_TYPES.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <select
        className={selectCls}
        value={params.get("owner") ?? ""}
        onChange={(e) => setParam("owner", e.target.value)}
      >
        <option value="">担当者（すべて）</option>
        {owners.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {showPhase && (
        <select
          className={selectCls}
          value={params.get("phase") ?? ""}
          onChange={(e) => setParam("phase", e.target.value)}
        >
          <option value="">フェーズ（すべて）</option>
          {PHASES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      )}
      {hasFilter && (
        <button
          onClick={() => router.push(pathname)}
          className="text-slate-500 hover:text-slate-800 underline"
        >
          クリア
        </button>
      )}
    </div>
  );
}
