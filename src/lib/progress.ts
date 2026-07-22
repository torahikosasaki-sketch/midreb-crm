// 進捗管理（販売単位×週）の集計ヘルパー

export type WeekLike = {
  videoSales?: number | null;
  liveSales?: number | null;
  videoGmv?: number | null;
  liveGmv?: number | null;
  targetCount?: number | null;
};

export const SALES_UNIT_STATUSES = ["稼働中", "終了"] as const;

/** 販売単位の表示名。顧客(Account)が紐付いていればその企業名を優先し、無ければ従来のブランド自由入力文字列にフォールバック */
export function unitBrandLabel(u: { brand: string; account?: { name: string } | null }): string {
  return u.account?.name ?? u.brand;
}

/** 週の総販売数（動画＋ライブ） */
export function weekSales(w: WeekLike): number {
  return (w.videoSales ?? 0) + (w.liveSales ?? 0);
}
/** 週の総GMV（動画＋ライブ） */
export function weekGmv(w: WeekLike): number {
  return (w.videoGmv ?? 0) + (w.liveGmv ?? 0);
}
/** 有効目標（週の指定値 → 無ければ販売単位の週次目標） */
export function effectiveTarget(
  w: WeekLike,
  unitWeeklyTarget: number | null | undefined
): number | null {
  return w.targetCount ?? unitWeeklyTarget ?? null;
}
/** 目標差分 = 総販売 − 目標（マイナス＝未達） */
export function weekGap(w: WeekLike, unitWeeklyTarget: number | null | undefined): number | null {
  const t = effectiveTarget(w, unitWeeklyTarget);
  if (t == null) return null;
  return weekSales(w) - t;
}
/** 達成率(%) = 総販売 / 目標 */
export function weekAchievement(
  w: WeekLike,
  unitWeeklyTarget: number | null | undefined
): number | null {
  const t = effectiveTarget(w, unitWeeklyTarget);
  if (!t || t <= 0) return null;
  return Math.round((weekSales(w) / t) * 100);
}

/** 週開始日を "M/D週" ラベルに */
export function weekLabel(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return `${dt.getMonth() + 1}/${dt.getDate()}週`;
}

/** yyyy-mm-dd */
export function ymd(d: Date | string | null): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}
