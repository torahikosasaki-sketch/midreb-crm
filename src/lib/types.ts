/** クライアントに渡す商談カードの最小表現（Date は文字列化済み） */
export type DealCard = {
  id: string;
  accountName: string | null;
  businessType: string;
  phase: string;
  probability: number;
  mrr: number; // 月額（契約中の月次定額）
  oneTime: number; // 単発合計
  acv: number; // 想定ACV(年換算)
  weightedAcv: number; // ACV × 確度
  owner: string | null;
  expectedCloseDate: string | null;
  nextActionDate: string | null;
  position: number;
};
