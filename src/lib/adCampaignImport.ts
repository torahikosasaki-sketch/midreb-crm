// 広告アカウントの「Product campaign data」xlsx → 日次実績の広告項目への取り込み（純粋ロジック）。
// 1行=1キャンペーン。列は固定位置で読む（列名は環境により文字化けし得るため位置指定）。
// 取り込む先: 広告費(adSpend)=費用(C) / 日予算(dailyBudget)=現在の予算(G) /
//            注文数(orderCount)=SKU発注(H) / 広告経由GMV(adGmv)=収益総額(J)
// キャンペーンID(A)・キャンペーン名(B) は突合/表示に使う。列構成が変わったらここだけ直す。

import * as XLSX from "xlsx";

/** 列インデックス（0始まり）。A=0,B=1,C=2,... */
export const AD_COLS = {
  campaignId: 0, // A: キャンペーンID
  campaignName: 1, // B: キャンペーン名
  adSpend: 2, // C: 費用 → 広告費
  dailyBudget: 6, // G: 現在の予算 → 日予算
  orderCount: 7, // H: SKU発注 → 注文数
  adGmv: 9, // J: 収益総額 → 広告経由GMV
} as const;

export type AdCampaign = {
  campaignId: string;
  campaignName: string;
  adSpend: number;
  dailyBudget: number;
  orderCount: number;
  adGmv: number;
};

export type AdParseResult = {
  campaigns: AdCampaign[];
  warnings: string[];
  totalRows: number;
};

function toNum(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Math.round(v);
  const n = Number(String(v).replace(/[¥,%\s"]/g, ""));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * base64エンコードされたxlsxを解析し、キャンペーン単位の広告実績を返す。DBには触れない。
 * ヘッダ行（1行目）はスキップ。キャンペーンIDが空の行は除外。
 */
export function parseAdCampaigns(base64: string): AdParseResult {
  const warnings: string[] = [];
  let rows: unknown[][];
  try {
    const wb = XLSX.read(base64, { type: "base64" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
  } catch {
    return { campaigns: [], warnings: ["ファイルを読み取れませんでした。xlsx形式か確認してください。"], totalRows: 0 };
  }
  if (rows.length < 2) {
    return { campaigns: [], warnings: ["データ行がありません。"], totalRows: Math.max(0, rows.length - 1) };
  }

  const C = AD_COLS;
  const campaigns: AdCampaign[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r] ?? [];
    const campaignId = String(cells[C.campaignId] ?? "").trim();
    if (!campaignId) continue;
    campaigns.push({
      campaignId,
      campaignName: String(cells[C.campaignName] ?? "").trim(),
      adSpend: toNum(cells[C.adSpend]),
      dailyBudget: toNum(cells[C.dailyBudget]),
      orderCount: toNum(cells[C.orderCount]),
      adGmv: toNum(cells[C.adGmv]),
    });
  }
  if (campaigns.length === 0) warnings.push("キャンペーン行が見つかりませんでした。列の並びをご確認ください。");
  return { campaigns, warnings, totalRows: rows.length - 1 };
}
