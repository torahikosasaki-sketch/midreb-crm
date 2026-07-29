// ============================================================================
// Seller Center CSV → DailyReport 列マッピング定義
// ★ここが「確定仕様で差し替える唯一の場所」。来週(火)の要件定義で確定したら
//   下の SELLER_CENTER_MAPPING の値だけを実際のCSVヘッダ名に合わせて修正すれば、
//   パース・突合・取り込みの骨格は変更不要で動作する。
// ============================================================================

/** DailyReport に取り込める数値指標フィールド */
export type DailyMetricField =
  | "videoPosts"
  | "liveCount"
  | "adSpend"
  | "adGmv"
  | "orderCount"
  | "shippingQty"
  | "shippingAmount";

/** 指標フィールドの日本語ラベル（プレビュー表示用） */
export const METRIC_LABELS: Record<DailyMetricField, string> = {
  videoPosts: "動画投稿数",
  liveCount: "ライブ実施回数",
  adSpend: "広告費",
  adGmv: "広告経由GMV",
  orderCount: "注文数",
  shippingQty: "配送 売上個数",
  shippingAmount: "配送 売上金額",
};

export type SellerCenterMapping = {
  /** 日付列のヘッダ名（★要確定） */
  dateHeader: string;
  /** 日付の書式。iso="2026-07-03" / slash="2026/07/03" / jp="2026年7月3日"（★要確定） */
  dateFormat: "iso" | "slash" | "jp";
  /** 商品識別に使う列のヘッダ名候補。先に見つかった非空の値を突合キーに使う（★要確定） */
  productHeaders: string[];
  /** 指標フィールド → CSVヘッダ名（★要確定。未使用のフィールドは省略可） */
  metricHeaders: Partial<Record<DailyMetricField, string>>;
};

/**
 * 暫定マッピング（★要確定）。
 * 実際のセラーセンターCSVのヘッダ名が判明したら、この値を差し替える。
 * ここに列挙したヘッダ名は「よくありそうな名称」の仮置きで、確定仕様ではない。
 */
export const SELLER_CENTER_MAPPING: SellerCenterMapping = {
  dateHeader: "日付", // ★要確定
  dateFormat: "iso", // ★要確定
  productHeaders: ["商品名", "SKU", "商品ID"], // ★要確定
  metricHeaders: {
    videoPosts: "動画投稿数", // ★要確定
    liveCount: "ライブ配信数", // ★要確定
    adSpend: "広告費", // ★要確定
    adGmv: "GMV", // ★要確定
    orderCount: "注文数", // ★要確定
    shippingQty: "配送個数", // ★要確定
    shippingAmount: "配送金額", // ★要確定
  },
};
