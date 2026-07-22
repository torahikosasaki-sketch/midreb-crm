// レポート機能（日次進捗報告）の集計ヘルパー

export type DailyReportLike = {
  videoPosts?: number | null;
  liveCount?: number | null;
  adSpend?: number | null;
  adGmv?: number | null;
  orderCount?: number | null;
  dailyBudget?: number | null;
  shippingQty?: number | null;
  shippingAmount?: number | null;
};

/** 有効日予算（当日の指定値 → 無ければ販売単位の既定日予算） */
export function effectiveDailyBudget(
  r: DailyReportLike,
  unitDailyAdBudget: number | null | undefined
): number | null {
  return r.dailyBudget ?? unitDailyAdBudget ?? null;
}

/** ROI(%) = 売上(GMV) ÷ 広告費 × 100 */
export function roi(r: DailyReportLike): number | null {
  if (r.adGmv == null || !r.adSpend) return null;
  return Math.round((r.adGmv / r.adSpend) * 1000) / 10;
}

/** CPA = 広告費 ÷ 注文数 */
export function cpa(r: DailyReportLike): number | null {
  if (r.adSpend == null || !r.orderCount) return null;
  return Math.round(r.adSpend / r.orderCount);
}

/** 日予算消化率(%) = 広告費 ÷ 有効日予算 × 100 */
export function budgetConsumptionRate(
  r: DailyReportLike,
  unitDailyAdBudget: number | null | undefined
): number | null {
  const budget = effectiveDailyBudget(r, unitDailyAdBudget);
  if (r.adSpend == null || !budget) return null;
  return Math.round((r.adSpend / budget) * 1000) / 10;
}

/** 日付を "M/D" ラベルに */
export function dayLabel(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

/** "YYYY-MM-DD" (UTC深夜) を安全にDateへ。setHours(local)は使わない */
export function startOfDay(d?: string | Date | null): Date {
  if (d == null) {
    const dt = new Date();
    dt.setUTCHours(0, 0, 0, 0);
    return dt;
  }
  const dt = typeof d === "string" ? new Date(d) : new Date(d.getTime());
  dt.setUTCHours(0, 0, 0, 0);
  return dt;
}

/** yyyy-mm-dd (UTC基準) */
export function ymdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type Period = "day" | "week" | "month";

/** その週の月曜日(UTC深夜)を返す */
function mondayOf(d: Date): Date {
  const dt = startOfDay(d);
  const dow = dt.getUTCDay(); // 0=日,1=月,...6=土
  const diff = dow === 0 ? -6 : 1 - dow; // 月曜まで戻る日数
  dt.setUTCDate(dt.getUTCDate() + diff);
  return dt;
}

/** その月の1日(UTC深夜)を返す */
function firstOfMonth(d: Date): Date {
  const dt = startOfDay(d);
  dt.setUTCDate(1);
  return dt;
}

/** 期間の基準日を正規化（day=そのまま/week=週の月曜/month=月の1日）。UTC深夜のDateを返す */
export function normalizeAnchor(period: Period, dateStr: string): Date {
  const d = startOfDay(dateStr);
  if (period === "week") return mondayOf(d);
  if (period === "month") return firstOfMonth(d);
  return d;
}

/** anchorを含む期間の [start, end)（endは排他的な次期間の開始）を返す */
export function periodRange(period: Period, anchor: Date): { start: Date; end: Date } {
  const start = new Date(anchor.getTime());
  const end = new Date(anchor.getTime());
  if (period === "day") {
    end.setUTCDate(end.getUTCDate() + 1);
  } else if (period === "week") {
    end.setUTCDate(end.getUTCDate() + 7);
  } else {
    end.setUTCMonth(end.getUTCMonth() + 1);
  }
  return { start, end };
}

/** 前/次の期間の anchor を返す */
export function shiftAnchor(period: Period, anchor: Date, dir: 1 | -1): Date {
  const next = new Date(anchor.getTime());
  if (period === "day") next.setUTCDate(next.getUTCDate() + dir);
  else if (period === "week") next.setUTCDate(next.getUTCDate() + 7 * dir);
  else next.setUTCMonth(next.getUTCMonth() + dir);
  return next;
}

/** 表示用の期間ラベル */
export function periodLabel(period: Period, anchor: Date): string {
  if (period === "day") return ymdUtc(anchor);
  if (period === "month") return `${anchor.getUTCFullYear()}年${anchor.getUTCMonth() + 1}月`;
  const { end } = periodRange(period, anchor);
  const last = new Date(end.getTime());
  last.setUTCDate(last.getUTCDate() - 1);
  return `${dayLabel(anchor)}週(${dayLabel(anchor)}〜${dayLabel(last)})`;
}

/** 複数件の日次レポートを数値項目ごとに合算し、1件分の集計値として返す */
export function sumReports(rows: DailyReportLike[]): DailyReportLike {
  const sum = (key: keyof DailyReportLike) => {
    const vals = rows.map((r) => r[key]).filter((v): v is number => v != null);
    return vals.length === 0 ? null : vals.reduce((a, b) => a + b, 0);
  };
  return {
    videoPosts: sum("videoPosts"),
    liveCount: sum("liveCount"),
    adSpend: sum("adSpend"),
    adGmv: sum("adGmv"),
    orderCount: sum("orderCount"),
    dailyBudget: sum("dailyBudget"),
    shippingQty: sum("shippingQty"),
    shippingAmount: sum("shippingAmount"),
  };
}

export type WeekProgressLike = {
  weekStart: Date;
  videoPosts?: number | null;
  liveCount?: number | null;
};

/**
 * 過去データ取り込み時のタイムゾーンずれ（UTC深夜でなく前日夕方などにずれたもの）を補正。
 * 深夜(00:00 UTC)であればそのまま、そうでなければ次の深夜へ繰り上げる（常に手前にずれるため）。
 */
function ceilToUtcMidnight(d: Date): Date {
  const day = 24 * 60 * 60 * 1000;
  return new Date(Math.ceil(d.getTime() / day) * day);
}

/** 期間[start, end)に含まれる週次実績(WeeklyProgress)の動画投稿数・ライブ実施回数を合算 */
export function weeklyCreativeTotals(
  weeks: WeekProgressLike[],
  start: Date,
  end: Date
): { videoPosts: number; liveCount: number; hasData: boolean } {
  const matched = weeks.filter((w) => {
    const normalized = ceilToUtcMidnight(w.weekStart);
    return normalized >= start && normalized < end;
  });
  return {
    videoPosts: matched.reduce((s, w) => s + (w.videoPosts ?? 0), 0),
    liveCount: matched.reduce((s, w) => s + (w.liveCount ?? 0), 0),
    hasData: matched.length > 0,
  };
}

/**
 * 案件進捗管理（週次実績 WeeklyProgress）に該当期間のデータがあれば、
 * レポートのクリエイティブ指標（動画投稿数・ライブ実施回数）を自動的にそちらから反映する。
 * 日次(period="day")は週次実績を1日単位に配分できないため対象外（日次入力のまま）。
 */
export function withWeeklyCreative<T extends DailyReportLike>(
  data: T,
  weeks: WeekProgressLike[],
  period: Period,
  start: Date,
  end: Date
): T {
  if (period === "day") return data;
  const wt = weeklyCreativeTotals(weeks, start, end);
  if (!wt.hasData) return data;
  return { ...data, videoPosts: wt.videoPosts, liveCount: wt.liveCount };
}

/** 直近count期間分のバケット（古い→新しい順）。each bucket は該当rowsをsumReportsで合算し、週次実績があれば自動反映する */
export function recentBuckets(
  rows: (DailyReportLike & { reportDate: Date })[],
  period: Period,
  count: number,
  anchor: Date = normalizeAnchor(period, ymdUtc(new Date())),
  weeks: WeekProgressLike[] = []
): { label: string; anchor: Date; data: DailyReportLike }[] {
  const buckets: { label: string; anchor: Date; data: DailyReportLike }[] = [];
  let cur = anchor;
  for (let i = 0; i < count; i++) {
    buckets.unshift({ label: "", anchor: cur, data: { } });
    cur = shiftAnchor(period, cur, -1);
  }
  return buckets.map((b) => {
    const { start, end } = periodRange(period, b.anchor);
    const matched = rows.filter((r) => r.reportDate >= start && r.reportDate < end);
    const summed = sumReports(matched);
    return {
      label: periodLabel(period, b.anchor),
      anchor: b.anchor,
      data: withWeeklyCreative(summed, weeks, period, start, end),
    };
  });
}
