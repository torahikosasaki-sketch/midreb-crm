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

/** 当日 00:00 を返す（date文字列指定時はその日の00:00） */
export function startOfDay(d?: string | Date | null): Date {
  const dt = d ? (typeof d === "string" ? new Date(d) : d) : new Date();
  dt.setHours(0, 0, 0, 0);
  return dt;
}
