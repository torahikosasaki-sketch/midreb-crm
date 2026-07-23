// レポート機能（日次進捗報告）の集計ヘルパー

import {
  type ResolvedPeriod,
  mdLabel,
  unitPeriod,
  previousPeriod,
  bucketConfig,
} from "./period";

// 期間モデルは period.ts に集約。下位互換のため一部を再輸出する。
export {
  type ResolvedPeriod,
  type PeriodKind,
  startOfDay,
  ymdUtc,
  unitPeriod,
  resolvePeriod,
  previousPeriod,
  nextPeriod,
  previousPeriodWord,
  periodKey,
  periodQuery,
  bucketConfig,
  weekStartOf,
  buildCustom,
} from "./period";

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

/** バケット用の短いラベル（day="M/D" / week="M/D週" / month="YYYY/M"） */
function shortLabel(rp: ResolvedPeriod): string {
  if (rp.kind === "week") return `${mdLabel(rp.start)}週`;
  if (rp.kind === "month") return `${rp.start.getUTCFullYear()}/${rp.start.getUTCMonth() + 1}`;
  return mdLabel(rp.start);
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

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 案件進捗管理（週次実績 WeeklyProgress）に該当期間のデータがあれば、
 * レポートのクリエイティブ指標（動画投稿数・ライブ実施回数）とチャネル別売上
 * （動画GMV・ライブGMV）を自動的にそちらから反映する。
 * ちょうど1日の期間（日次バケット）は週次実績を1日単位に配分できないため対象外。
 */
export function withWeeklyCreative<T extends DailyReportLike>(
  data: T,
  weeks: WeekProgressLike[],
  start: Date,
  end: Date
): T {
  // 1日ちょうどの期間は日次入力のまま（週次実績を按分しない）
  if (end.getTime() - start.getTime() <= DAY_MS) return data;
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

/**
 * 推移グラフ用のバケット（古い→新しい順）。ResolvedPeriod の bucketConfig に従う。
 * day/week/month は選択期間を最後尾に count 個さかのぼる。custom は範囲内を unit で敷き詰める。
 * 各バケットは該当rowsをsumReportsで合算し、週次実績があれば自動反映する。
 */
export function recentBuckets(
  rows: (DailyReportLike & { reportDate: Date })[],
  rp: ResolvedPeriod,
  weeks: WeekProgressLike[] = []
): { label: string; anchor: Date; data: DailyReportLike }[] {
  const { unit, count } = bucketConfig(rp);
  const periods: ResolvedPeriod[] = [];

  if (rp.kind === "custom") {
    // 範囲 [start, end) を unit で左→右に敷き詰める
    let cur = unitPeriod(unit, rp.start);
    let guard = 0;
    while (cur.start.getTime() < rp.end.getTime() && guard < 500) {
      periods.push(cur);
      cur = unitPeriod(unit, new Date(cur.end.getTime()));
      guard++;
    }
  } else {
    // 選択期間のバケットを最後尾に count 個さかのぼる
    let cur = unitPeriod(unit, rp.start);
    for (let i = 0; i < count; i++) {
      periods.unshift(cur);
      cur = previousPeriod(cur);
    }
  }

  return periods.map((b) => {
    const matched = rows.filter((r) => r.reportDate >= b.start && r.reportDate < b.end);
    const summed = sumReports(matched);
    return {
      label: shortLabel(b),
      anchor: b.start,
      data: withWeeklyCreative(summed, weeks, b.start, b.end),
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

/** コンテンツ経由売上の動画/ライブ構成（合計・比率）。データが無ければ null */
export function channelShare(
  r: DailyReportLike
): { total: number; video: number; live: number; videoPct: number; livePct: number } | null {
  const video = r.videoGmv ?? 0;
  const live = r.liveGmv ?? 0;
  const total = video + live;
  if (total <= 0) return null;
  const videoPct = Math.round((video / total) * 100);
  return { total, video, live, videoPct, livePct: 100 - videoPct };
}

const yen = (n: number) => "¥" + Math.round(n).toLocaleString("ja-JP");

/** サマリー示唆の1件。tone で色・アイコンの意味づけを行う */
export type InsightTone = "good" | "warn" | "bad" | "info";
export type InsightItem = { tone: InsightTone; text: string };

/** 示唆生成に渡す入力（現在期間・前期間の集計値と算出済み指標） */
export type InsightInput = {
  prevWord: string; // 比較対象を指す言葉（先週/先月/前期間 など）
  current: DailyReportLike;
  previous: DailyReportLike;
  roiCur: number | null;
  roiPrev: number | null;
  cpaCur: number | null;
  cpaPrev: number | null;
  budgetRate: number | null;
};

// 優先度: 小さいほど上位（bad/warnを先頭に）
const TONE_ORDER: Record<InsightTone, number> = { bad: 0, warn: 1, good: 2, info: 3 };

/**
 * 数字から読み取れる示唆を、カテゴリ（tone）付きで生成する。
 * 決定的なルールベース（AI生成ではない）。重要度順にソートして返す。
 */
export function buildInsights(input: InsightInput): InsightItem[] {
  const items: InsightItem[] = [];
  const w = input.prevWord;
  const { current: cur, previous: prev } = input;

  // 1. コンテンツ経由売上（動画＋ライブ）のヘッドライン＋トレンド
  const share = channelShare(cur);
  const sharePrev = channelShare(prev);
  if (share) {
    const gmvChange = trendPct(share.total, sharePrev?.total ?? null);
    if (gmvChange == null) {
      items.push({ tone: "info", text: `コンテンツ経由の売上は ${yen(share.total)} です。` });
    } else if (gmvChange > 0) {
      items.push({ tone: "good", text: `コンテンツ経由の売上は ${yen(share.total)}（${w}比 +${gmvChange}%）と伸びています。` });
    } else if (gmvChange < 0) {
      items.push({
        tone: gmvChange <= -20 ? "bad" : "warn",
        text: `コンテンツ経由の売上は ${yen(share.total)}（${w}比 ${gmvChange}%）と減少しています。`,
      });
    } else {
      items.push({ tone: "info", text: `コンテンツ経由の売上は ${yen(share.total)}（${w}と横ばい）です。` });
    }

    // 2. チャネル構成と前期間からのシフト
    const dominant = share.videoPct >= share.livePct ? "動画投稿" : "ライブ配信";
    const domPct = Math.max(share.videoPct, share.livePct);
    let shiftNote = "";
    if (sharePrev) {
      const videoDiff = share.videoPct - sharePrev.videoPct;
      if (videoDiff >= 5) shiftNote = `。動画の構成比が${w}より+${videoDiff}pt上昇`;
      else if (videoDiff <= -5) shiftNote = `。ライブの構成比が${w}より+${-videoDiff}pt上昇`;
    }
    items.push({ tone: "info", text: `売上は${dominant}が牽引（全体の${domPct}%）${shiftNote}です。` });
  }

  const hasAd = (cur.adSpend ?? 0) > 0;

  // 3. ROIの健全性（絶対水準）＋トレンド
  if (hasAd && input.roiCur != null) {
    const roiTrend =
      input.roiPrev != null ? Math.round((input.roiCur - input.roiPrev) * 10) / 10 : null;
    const trendTxt =
      roiTrend != null && Math.abs(roiTrend) >= 1
        ? `（${w}比 ${roiTrend > 0 ? "+" : ""}${roiTrend}pt）`
        : "";
    if (input.roiCur >= 300) {
      items.push({ tone: "good", text: `ROIは ${input.roiCur}% と高水準${trendTxt}です。` });
    } else if (input.roiCur < 150) {
      items.push({ tone: "bad", text: `ROIが ${input.roiCur}% と低め${trendTxt}。広告効率の見直しが必要です。` });
    } else if (roiTrend != null && Math.abs(roiTrend) >= 1) {
      items.push({
        tone: roiTrend > 0 ? "good" : "warn",
        text: `ROIは ${input.roiCur}%（${w}比 ${roiTrend > 0 ? "+" : ""}${roiTrend}pt）${roiTrend > 0 ? "改善" : "悪化"}しています。`,
      });
    }
  }

  // 4. 日予算消化率
  if (input.budgetRate != null) {
    if (input.budgetRate >= 100) {
      items.push({ tone: "bad", text: `日予算消化率が ${input.budgetRate}% に達しています。予算超過に注意してください。` });
    } else if (input.budgetRate >= 90) {
      items.push({ tone: "warn", text: `日予算消化率が ${input.budgetRate}% と高めです。` });
    } else if (input.budgetRate > 0 && input.budgetRate < 50) {
      items.push({ tone: "info", text: `日予算消化率は ${input.budgetRate}% と余裕があります。` });
    }
  }

  // 5. CPA（下がる方が良い）
  const cpaChange = trendPct(input.cpaCur, input.cpaPrev);
  if (hasAd && cpaChange != null && Math.abs(cpaChange) >= 5) {
    items.push({
      tone: cpaChange > 0 ? "warn" : "good",
      text: `CPAは${w}比 ${cpaChange > 0 ? "+" : ""}${cpaChange}%（${cpaChange > 0 ? "悪化" : "改善"}）しています。`,
    });
  }

  // 6. 注文数
  const orderChange = trendPct(cur.orderCount, prev.orderCount);
  if (orderChange != null && Math.abs(orderChange) >= 5) {
    items.push({
      tone: orderChange > 0 ? "good" : "warn",
      text: `注文数は${w}比 ${orderChange > 0 ? "+" : ""}${orderChange}%（${orderChange > 0 ? "増加" : "減少"}）しています。`,
    });
  }

  // 7. クリエイティブ活動量（動画投稿・ライブ実施）の増減
  const postsChange = trendPct(cur.videoPosts, prev.videoPosts);
  const liveChange = trendPct(cur.liveCount, prev.liveCount);
  if (postsChange != null && liveChange != null && postsChange <= -20 && liveChange <= -20) {
    items.push({ tone: "warn", text: `動画投稿・ライブ実施ともに${w}より大きく減少しています。制作ペースの確認を。` });
  } else if (postsChange != null && postsChange >= 20) {
    items.push({ tone: "info", text: `動画投稿数が${w}比 +${postsChange}% と増えています。` });
  }

  if (items.length === 0) {
    items.push({ tone: "info", text: "この期間に集計できるデータがまだありません。案件進捗管理から実績を入力してください。" });
  }

  // 重要度順（bad → warn → good → info）に安定ソート
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => TONE_ORDER[a.it.tone] - TONE_ORDER[b.it.tone] || a.i - b.i)
    .map(({ it }) => it)
    .slice(0, 6);
}
