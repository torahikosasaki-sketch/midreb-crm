// レポート機能（日次進捗報告）の集計ヘルパー

export type DailyReportLike = {
  videoPosts?: number | null;
  liveCount?: number | null;
  videoGmv?: number | null; // 動画投稿経由の売上（案件進捗管理の週次実績から反映）
  liveGmv?: number | null; // ライブ配信経由の売上（案件進捗管理の週次実績から反映）
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

/** 動画GMV＋ライブGMVの合計（コンテンツ経由の売上合計）。両方nullならnull */
export function contentGmvTotal(r: DailyReportLike): number | null {
  if (r.videoGmv == null && r.liveGmv == null) return null;
  return (r.videoGmv ?? 0) + (r.liveGmv ?? 0);
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

/** 比較対象期間を指す言葉（前日/先週/先月） */
export function previousPeriodWord(period: Period): string {
  return period === "day" ? "前日" : period === "week" ? "先週" : "先月";
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
    videoGmv: sum("videoGmv"),
    liveGmv: sum("liveGmv"),
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
  videoGmv?: number | null;
  liveGmv?: number | null;
};

/**
 * 過去データ取り込み時のタイムゾーンずれ（UTC深夜でなく前日夕方などにずれたもの）を補正。
 * 深夜(00:00 UTC)であればそのまま、そうでなければ次の深夜へ繰り上げる（常に手前にずれるため）。
 */
function ceilToUtcMidnight(d: Date): Date {
  const day = 24 * 60 * 60 * 1000;
  return new Date(Math.ceil(d.getTime() / day) * day);
}

/** 期間[start, end)に含まれる週次実績(WeeklyProgress)の動画投稿数・ライブ実施回数・動画GMV・ライブGMVを合算 */
export function weeklyCreativeTotals(
  weeks: WeekProgressLike[],
  start: Date,
  end: Date
): { videoPosts: number; liveCount: number; videoGmv: number; liveGmv: number; hasData: boolean } {
  const matched = weeks.filter((w) => {
    const normalized = ceilToUtcMidnight(w.weekStart);
    return normalized >= start && normalized < end;
  });
  return {
    videoPosts: matched.reduce((s, w) => s + (w.videoPosts ?? 0), 0),
    liveCount: matched.reduce((s, w) => s + (w.liveCount ?? 0), 0),
    videoGmv: matched.reduce((s, w) => s + (w.videoGmv ?? 0), 0),
    liveGmv: matched.reduce((s, w) => s + (w.liveGmv ?? 0), 0),
    hasData: matched.length > 0,
  };
}

/**
 * 案件進捗管理（週次実績 WeeklyProgress）に該当期間のデータがあれば、
 * レポートのクリエイティブ指標（動画投稿数・ライブ実施回数）とチャネル別売上
 * （動画GMV・ライブGMV）を自動的にそちらから反映する。
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
  return {
    ...data,
    videoPosts: wt.videoPosts,
    liveCount: wt.liveCount,
    videoGmv: wt.videoGmv,
    liveGmv: wt.liveGmv,
  };
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

/** 現在値と前期間値から増減率(%)を算出する */
export function trendPct(
  current: number | null | undefined,
  previous: number | null | undefined
): number | null {
  if (current == null || previous == null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** サマリー示唆生成に渡す入力値（現在値・前期間値） */
export type InsightInput = {
  period: Period;
  adGmv: number | null | undefined;
  adGmvPrev: number | null | undefined;
  adSpend: number | null | undefined;
  roi: number | null | undefined;
  roiPrev: number | null | undefined;
  videoGmv: number | null | undefined;
  liveGmv: number | null | undefined;
  orderCount: number | null | undefined;
  orderCountPrev: number | null | undefined;
  cpa: number | null | undefined;
  cpaPrev: number | null | undefined;
  budgetRate: number | null | undefined;
};

/** 数字から読み取れる示唆を日本語の箇条書きにまとめる（決定的なルールベース、AI生成ではない） */
export function buildInsights(input: InsightInput): string[] {
  const insights: string[] = [];
  const w = previousPeriodWord(input.period);

  const hasAdData = (input.adGmv ?? 0) !== 0 || (input.adGmvPrev ?? 0) !== 0;
  const gmvChange = hasAdData ? trendPct(input.adGmv, input.adGmvPrev) : null;
  if (gmvChange != null) {
    if (gmvChange > 0) insights.push(`広告経由の売上は${w}比 +${gmvChange}% と伸びています。`);
    else if (gmvChange < 0) insights.push(`広告経由の売上は${w}比 ${gmvChange}% と減少しています。`);
    else insights.push(`広告経由の売上は${w}と横ばいです。`);
  }

  if (input.roi != null && input.roiPrev != null) {
    const diff = Math.round((input.roi - input.roiPrev) * 10) / 10;
    if (Math.abs(diff) >= 1) {
      insights.push(
        `ROIは${w}比 ${diff > 0 ? "+" : ""}${diff}pt${diff > 0 ? "改善しています" : "悪化しています"}。`
      );
    }
  }

  const video = input.videoGmv ?? 0;
  const live = input.liveGmv ?? 0;
  const contentTotal = video + live;
  if (contentTotal > 0) {
    const dominant = video >= live ? "動画投稿" : "ライブ配信";
    const share = Math.round(((video >= live ? video : live) / contentTotal) * 100);
    insights.push(`コンテンツ経由の売上は${dominant}が中心（全体の${share}%）です。`);
  }

  if (input.budgetRate != null && input.budgetRate >= 100) {
    insights.push(`日予算消化率が${input.budgetRate}%に達しています。予算超過に注意してください。`);
  } else if (input.budgetRate != null && input.budgetRate >= 90) {
    insights.push(`日予算消化率が${input.budgetRate}%と高めです。`);
  }

  const cpaChange = trendPct(input.cpa, input.cpaPrev);
  if (cpaChange != null && Math.abs(cpaChange) >= 5) {
    insights.push(
      `CPAは${w}比 ${cpaChange > 0 ? "+" : ""}${cpaChange}% ${cpaChange > 0 ? "悪化（上昇）しています" : "改善（低下）しています"}。`
    );
  }

  const orderChange = trendPct(input.orderCount, input.orderCountPrev);
  if (orderChange != null && Math.abs(orderChange) >= 5) {
    insights.push(`注文数は${w}比 ${orderChange > 0 ? "+" : ""}${orderChange}% ${orderChange > 0 ? "増加" : "減少"}しています。`);
  }

  if (insights.length === 0) insights.push("比較できるデータが十分にありません。");

  return insights;
}
