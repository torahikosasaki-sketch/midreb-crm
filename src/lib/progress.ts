// 進捗管理の集計ヘルパー。実績は日次(DailyReport)に一本化し、週次/月次は日次のロールアップで算出する。

import { weekStartOf } from "./period";

export type WeekLike = {
  videoSales?: number | null;
  liveSales?: number | null;
  videoGmv?: number | null;
  liveGmv?: number | null;
  targetCount?: number | null;
};

/** 日次実績1件分（ロールアップ入力用の最小形） */
export type DailyLike = {
  reportDate: Date;
  videoPosts?: number | null;
  videoPosters?: number | null;
  videoSales?: number | null;
  videoGmv?: number | null;
  liveCount?: number | null;
  livePresenters?: number | null;
  liveSales?: number | null;
  liveGmv?: number | null;
};

/** 日次実績を金曜起点の週へ集約した1週間分の断面 */
export type WeekRollup = {
  weekStart: Date; // 週開始（金曜・UTC深夜）
  videoPosts: number;
  videoPosters: number;
  videoSales: number;
  videoGmv: number;
  liveCount: number;
  livePresenters: number;
  liveSales: number;
  liveGmv: number;
  days: number; // その週に実績が入っている日数
};

/**
 * 日次実績を金曜起点の週にまとめて、週開始日の昇順で返す。
 * 「日次で積み上げ→週次断面で見る」の集計の中核。
 */
export function rollupWeeks(reports: DailyLike[]): WeekRollup[] {
  const map = new Map<number, WeekRollup>();
  for (const r of reports) {
    const ws = weekStartOf(r.reportDate);
    const key = ws.getTime();
    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        weekStart: ws,
        videoPosts: 0, videoPosters: 0, videoSales: 0, videoGmv: 0,
        liveCount: 0, livePresenters: 0, liveSales: 0, liveGmv: 0,
        days: 0,
      };
      map.set(key, bucket);
    }
    bucket.videoPosts += r.videoPosts ?? 0;
    bucket.videoPosters += r.videoPosters ?? 0;
    bucket.videoSales += r.videoSales ?? 0;
    bucket.videoGmv += r.videoGmv ?? 0;
    bucket.liveCount += r.liveCount ?? 0;
    bucket.livePresenters += r.livePresenters ?? 0;
    bucket.liveSales += r.liveSales ?? 0;
    bucket.liveGmv += r.liveGmv ?? 0;
    bucket.days += 1;
  }
  return [...map.values()].sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

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
