"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export type Period = "day" | "week" | "month";

const PERIOD_LABELS: Record<Period, string> = {
  day: "日次",
  week: "週次",
  month: "月次",
};

function shiftDateStr(period: Period, dateStr: string, dir: 1 | -1): string {
  const d = new Date(dateStr);
  if (period === "day") d.setUTCDate(d.getUTCDate() + dir);
  else if (period === "week") d.setUTCDate(d.getUTCDate() + 7 * dir);
  else d.setUTCMonth(d.getUTCMonth() + dir);
  return d.toISOString().slice(0, 10);
}

/** 日次/週次/月次の切替タブ＋日付選択＋前後移動。dateはUTC基準の "YYYY-MM-DD"（期間の基準日。正規化はサーバー側で行う） */
export function ReportPeriodPicker({ date, period }: { date: string; period: Period }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function goTo(nextDate: string, nextPeriod: Period) {
    const p = new URLSearchParams(params.toString());
    p.set("date", nextDate);
    p.set("period", nextPeriod);
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="print:hidden flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => goTo(date, p)}
            className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
              p === period ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goTo(shiftDateStr(period, date, -1), period)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          aria-label="前の期間"
        >
          ←
        </button>
        {period === "month" ? (
          <input
            type="month"
            value={date.slice(0, 7)}
            onChange={(e) => e.target.value && goTo(`${e.target.value}-01`, period)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
        ) : (
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && goTo(e.target.value, period)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
        )}
        <button
          type="button"
          onClick={() => goTo(shiftDateStr(period, date, 1), period)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          aria-label="次の期間"
        >
          →
        </button>
      </div>
    </div>
  );
}
