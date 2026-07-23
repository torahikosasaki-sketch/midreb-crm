"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  resolvePeriod,
  previousPeriod,
  nextPeriod,
  periodQuery,
  buildCustom,
  firstOfMonth,
  startOfDay,
  ymdUtc,
  type PeriodKind,
} from "@/lib/period";

const KIND_LABELS: Record<Exclude<PeriodKind, "custom">, string> = {
  day: "日次",
  week: "週次",
  month: "月次",
};

function todayYmd(): string {
  return ymdUtc(startOfDay());
}
function addDaysYmd(ymd: string, n: number): string {
  const d = startOfDay(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return ymdUtc(d);
}

/**
 * レポートの集計期間ピッカー。日次/週次(金〜木)/月次のプリセットタブに加え、
 * 任意の開始〜終了・「直近N日」などのカスタム範囲を指定できる。
 * URLを ?period=... または ?period=custom&from=..&to=.. に更新する。
 */
export function ReportRangePicker({
  kind,
  date,
  from,
  to,
}: {
  kind: PeriodKind;
  date: string; // day/week/month の基準日（期間の開始日 ymd）
  from?: string; // custom の開始
  to?: string; // custom の終了（両端含む）
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function push(query: string) {
    const p = new URLSearchParams(params.toString());
    // 期間系のキーを一旦除去してから差し替え
    ["period", "date", "from", "to"].forEach((k) => p.delete(k));
    for (const kv of query.split("&")) {
      const [k, v] = kv.split("=");
      if (k) p.set(k, decodeURIComponent(v ?? ""));
    }
    router.push(`${pathname}?${p.toString()}`);
  }

  function goKind(next: Exclude<PeriodKind, "custom">) {
    push(`period=${next}&date=${date}`);
  }
  function goCustom(f: string, t: string) {
    push(periodQuery(buildCustom(f, t)));
  }
  function shift(dir: -1 | 1) {
    const rp = resolvePeriod({ period: kind, date, from, to });
    const moved = dir === -1 ? previousPeriod(rp) : nextPeriod(rp);
    push(periodQuery(moved));
  }

  const isCustom = kind === "custom";
  const curFrom = from ?? date;
  const curTo = to ?? date;

  return (
    <div className="print:hidden flex items-center gap-2 flex-wrap">
      {/* 期間種別タブ */}
      <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
        {(Object.keys(KIND_LABELS) as Exclude<PeriodKind, "custom">[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => goKind(k)}
            className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
              k === kind ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            {KIND_LABELS[k]}
          </button>
        ))}
        <button
          type="button"
          onClick={() => goCustom(curFrom, curTo)}
          className={`rounded-md px-2.5 py-1 text-sm font-medium transition-colors ${
            isCustom ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-200"
          }`}
        >
          カスタム
        </button>
      </div>

      {!isCustom ? (
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50" aria-label="前の期間">
            ←
          </button>
          {kind === "month" ? (
            <input
              type="month"
              value={date.slice(0, 7)}
              onChange={(e) => e.target.value && push(`period=month&date=${e.target.value}-01`)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            />
          ) : (
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && push(`period=${kind}&date=${e.target.value}`)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            />
          )}
          <button type="button" onClick={() => shift(1)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50" aria-label="次の期間">
            →
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          {/* プリセット */}
          <select
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              const today = todayYmd();
              if (v === "last7") goCustom(addDaysYmd(today, -6), today);
              else if (v === "last30") goCustom(addDaysYmd(today, -29), today);
              else if (v === "thisMonth") {
                const first = ymdUtc(firstOfMonth(startOfDay(today)));
                goCustom(first, today);
              }
              e.target.value = "";
            }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-600"
          >
            <option value="">プリセット…</option>
            <option value="last7">直近7日間</option>
            <option value="last30">直近30日間</option>
            <option value="thisMonth">今月（1日〜本日）</option>
          </select>
          {/* 開始〜終了 */}
          <input
            type="date"
            value={curFrom}
            max={curTo}
            onChange={(e) => e.target.value && goCustom(e.target.value, curTo)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            aria-label="開始日"
          />
          <span className="text-slate-400 text-sm">〜</span>
          <input
            type="date"
            value={curTo}
            min={curFrom}
            onChange={(e) => e.target.value && goCustom(curFrom, e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            aria-label="終了日"
          />
          <button type="button" onClick={() => shift(-1)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50" aria-label="1期間前へ">
            ← 前へ
          </button>
        </div>
      )}
    </div>
  );
}
