"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

function shiftDate(ymdStr: string, days: number): string {
  const d = new Date(ymdStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ReportDatePicker({ date }: { date: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function goTo(next: string) {
    const p = new URLSearchParams(params.toString());
    p.set("date", next);
    router.push(`${pathname}?${p.toString()}`);
  }

  return (
    <div className="print:hidden flex items-center gap-1">
      <button
        type="button"
        onClick={() => goTo(shiftDate(date, -1))}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        aria-label="前日"
      >
        ←
      </button>
      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && goTo(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
      />
      <button
        type="button"
        onClick={() => goTo(shiftDate(date, 1))}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        aria-label="翌日"
      >
        →
      </button>
    </div>
  );
}
