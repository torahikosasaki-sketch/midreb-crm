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

/** 事業タグのチップ配色（Tailwind クラス） */
export const BUSINESS_TYPE_COLORS: Record<string, string> = {
  storeb: "bg-emerald-100 text-emerald-700",
  "TTS導入・運用支援": "bg-teal-100 text-teal-700",
  越境支援: "bg-violet-100 text-violet-700",
  "他社動画・ライブ支援": "bg-amber-100 text-amber-700",
  コンサル: "bg-rose-100 text-rose-700",
};
export function bizTagClass(tag: string): string {
  return BUSINESS_TYPE_COLORS[tag] ?? "bg-slate-100 text-slate-600";
}

/** 商談フェーズ（標準フロー）。順序はカンバン列の並び順 */
export const PHASES = [
  "初回接触",
  "提案済み",
  "口頭受注",
  "契約書レビュー中",
  "契約締結済み",
  "失注",
  "保留",
] as const;
export type Phase = (typeof PHASES)[number];

/** 契約締結済みフェーズ（顧客化の対象） */
export const CONTRACTED_PHASE: Phase = "契約締結済み";

/** 進行中とみなすフェーズ。失注/保留は除外 */
export const ACTIVE_PHASES: Phase[] = [
  "初回接触",
  "提案済み",
  "口頭受注",
  "契約書レビュー中",
  "契約締結済み",
];

/** カンバン（商談）に表示するフェーズ列。契約締結済みもそのまま配置する */
export const KANBAN_PHASES: Phase[] = [
  "初回接触",
  "提案済み",
  "口頭受注",
  "契約書レビュー中",
  "契約締結済み",
  "保留",
  "失注",
];

/** 課金タイプ */
export const BILLING_TYPES = ["月次定額", "単発"] as const;
export type BillingType = (typeof BILLING_TYPES)[number];

/** 明細（契約）状態 */
export const LINE_STATUSES = ["契約中", "解約"] as const;

/** 明細の集計に使う最小形 */
export type LineLike = {
  billingType: string;
  amount: number;
  quantity: number;
  status?: string | null;
};

const isRecurring = (l: LineLike) => l.billingType === "月次定額";
const isActive = (l: LineLike) => (l.status ?? "契約中") !== "解約";
const sub = (l: LineLike) => l.amount * (l.quantity ?? 1);

/** 月額合計(MRR): 契約中の月次定額のみ */
export function linesMrr(lines: LineLike[]): number {
  return lines.filter((l) => isRecurring(l) && isActive(l)).reduce((s, l) => s + sub(l), 0);
}
/** 単発合計 */
export function linesOneTime(lines: LineLike[]): number {
  return lines.filter((l) => !isRecurring(l)).reduce((s, l) => s + sub(l), 0);
}
/** 想定ACV(年換算) = 単発合計 + 月額合計×12 */
export function linesAcv(lines: LineLike[]): number {
  return linesOneTime(lines) + linesMrr(lines) * 12;
}

/** フェーズごとの確度デフォルト（手入力で上書き可） */
export const PHASE_DEFAULT_PROBABILITY: Record<Phase, number> = {
  初回接触: 0.1,
  提案済み: 0.3,
  口頭受注: 0.6,
  契約書レビュー中: 0.8,
  契約締結済み: 1.0,
  失注: 0,
  保留: 0.1,
};

/** カンバン列の色（Tailwind クラス断片） */
export const PHASE_COLORS: Record<Phase, string> = {
  初回接触: "bg-slate-400",
  提案済み: "bg-teal-500",
  口頭受注: "bg-cyan-500",
  契約書レビュー中: "bg-amber-500",
  契約締結済み: "bg-emerald-500",
  失注: "bg-rose-500",
  保留: "bg-zinc-400",
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

/** 従業員の役割 */
export const EMPLOYEE_ROLES = ["セールス", "CS", "コーポレート"] as const;

export const LINK_METHODS = ["システム自動連携", "手動"] as const;

export const SHIP_STATUSES = ["未出荷", "出荷準備中", "出荷済"] as const;

export const RETURN_METHODS = ["現金還元", "マーケ予算転用"] as const;

/** 円フォーマット（¥1,234,567） */
export function formatYen(n: number | null | undefined): string {
  if (n == null) return "¥0";
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}
