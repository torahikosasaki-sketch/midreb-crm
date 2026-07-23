// レポート可視化の配色。dataviz スキルの検証済みパレット（light mode）から採用。
// エンティティ→色は固定（動画=青 / ライブ=菫）。CVD分離 ΔE 47.2 で検証済み。

export const CH = {
  video: "#2a78d6", // 動画（categorical slot 1: blue）
  live: "#4a3aa7", // ライブ（categorical slot 5: violet）
  gmv: "#1baf7a", // 売上/GMV（categorical slot 2: aqua＝ブランドのemerald寄り）
  adSpend: "#eda100", // 広告費（categorical slot 3: yellow）
  roi: "#2a78d6", // ROI（単独系列）
} as const;

// ステータス色（固定・テーマ非依存）。アイコン/ラベルと必ず併用する。
export const STATUS = {
  good: "#0ca30c",
  warn: "#fab219",
  bad: "#d03b3b",
  info: "#64748b", // slate-500
} as const;

export const SURFACE = "#fcfcfb"; // スタック棒のサーフェスギャップ用
export const GRID = "#e2e8f0";
export const AXIS_TICK = "#64748b";
