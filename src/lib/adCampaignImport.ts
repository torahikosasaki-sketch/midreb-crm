// 広告アカウントの「Product campaign data」ファイル(xlsx / CSV) → 日次実績の広告項目への取り込み。
// 1行=1キャンペーン。列は固定位置で読む（列名は環境により文字化けし得るため位置指定）。
// 取り込む先: 広告費(adSpend)=費用(C) / 日予算(dailyBudget)=現在の予算(G) /
//            注文数(orderCount)=SKU発注(H) / 広告経由GMV(adGmv)=収益総額(J)
// キャンペーンID(A)・キャンペーン名(B) は突合/表示に使う。列構成が変わったらここだけ直す。
// サーバー側で実行（Buffer/TextDecoder利用可）。CSVはShift-JIS/UTF-8を自動判定。

import * as XLSX from "xlsx";
import { parseCsv } from "./csvImport";

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

/** base64 → バイト列 */
function base64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}
/** テキスト復号（UTF-8で置換文字が出たらShift-JISで再デコード） */
function decodeText(bytes: Uint8Array): string {
  let t = new TextDecoder("utf-8").decode(bytes);
  if (t.includes("�")) {
    try { t = new TextDecoder("shift_jis").decode(bytes); } catch { /* keep utf-8 */ }
  }
  return t;
}

/**
 * base64エンコードされた xlsx または CSV を解析し、キャンペーン単位の広告実績を返す。DBには触れない。
 * 先頭バイトが "PK"(zip) なら xlsx、それ以外は CSV(文字コード自動判定) として読む。
 * ヘッダ行（1行目）はスキップ。キャンペーンIDが空の行は除外。
 */
export function parseAdCampaigns(base64: string): AdParseResult {
  const warnings: string[] = [];
  let rows: unknown[][];
  try {
    const bytes = base64ToBytes(base64);
    const isXlsx = bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK" = zip/xlsx
    if (isXlsx) {
      const wb = XLSX.read(bytes, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
    } else {
      rows = parseCsv(decodeText(bytes)) as unknown[][];
    }
  } catch {
    return { campaigns: [], warnings: ["ファイルを読み取れませんでした。xlsx/CSV形式か確認してください。"], totalRows: 0 };
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
