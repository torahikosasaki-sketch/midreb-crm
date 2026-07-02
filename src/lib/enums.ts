// ドメインのマスター値。SQLite/Postgres どちらでも String で保持し、ここで値を制約する。

/** 事業区分 */
export const BUSINESS_TYPES = [
  "storeb",
  "TTS導入・運用支援",
  "越境支援",
  "他社動画・ライブ支援",
  "コンサル",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

/** 商談フェーズ（標準フロー）。order はカンバン列の並び順 */
export const PHASES = [
  "初回接触",
  "提案",
  "条件調整",
  "契約",
  "オンボーディング",
  "運用中",
  "保留",
  "失注",
] as const;
export type Phase = (typeof PHASES)[number];

/** 進行中（パイプライン）とみなすフェーズ。失注/保留は除外 */
export const ACTIVE_PHASES: Phase[] = [
  "初回接触",
  "提案",
  "条件調整",
  "契約",
  "オンボーディング",
  "運用中",
];

/** フェーズごとの確度デフォルト（手入力で上書き可） */
export const PHASE_DEFAULT_PROBABILITY: Record<Phase, number> = {
  初回接触: 0.1,
  提案: 0.3,
  条件調整: 0.5,
  契約: 0.8,
  オンボーディング: 0.9,
  運用中: 1.0,
  保留: 0.1,
  失注: 0,
};

/** カンバン列の色（Tailwind クラス断片） */
export const PHASE_COLORS: Record<Phase, string> = {
  初回接触: "bg-slate-400",
  提案: "bg-sky-500",
  条件調整: "bg-amber-500",
  契約: "bg-violet-500",
  オンボーディング: "bg-emerald-500",
  運用中: "bg-green-600",
  保留: "bg-zinc-400",
  失注: "bg-rose-500",
};

export const CONTRACT_STATUSES = [
  "未着手",
  "ドラフト",
  "midreb確認中",
  "先方レビュー中",
  "締結済み",
] as const;

export const CONTRACT_TYPES = ["個別契約書", "storeb利用規約"] as const;

export const REGIONS = ["国内ブランド", "海外ブランド"] as const;

export const ACCOUNT_STATUSES = [
  "見込み",
  "商談中",
  "取引中",
  "休眠",
] as const;

export const ACTIVITY_TYPES = ["架電", "MTG", "提案送付", "メール", "その他"] as const;

export const TALENT_TYPES = ["CAP", "TAP"] as const;

export const LINK_METHODS = ["システム自動連携", "手動"] as const;

export const SHIP_STATUSES = ["未出荷", "出荷準備中", "出荷済"] as const;

export const RETURN_METHODS = ["現金還元", "マーケ予算転用"] as const;

/** 加重売上 = 想定売上 × 確度 */
export function weightedRevenue(expectedRevenue: number, probability: number): number {
  return Math.round(expectedRevenue * probability);
}

/** 円フォーマット（¥1,234,567） */
export function formatYen(n: number | null | undefined): string {
  if (n == null) return "¥0";
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}

/** 提供サービス文字列をタグ配列に */
export function parseServices(services: string | null | undefined): string[] {
  if (!services) return [];
  return services
    .split(/[,、]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
