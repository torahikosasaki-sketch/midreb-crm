/** クライアントに渡す商談カードの最小表現（Date は文字列化済み） */
export type DealCard = {
  id: string;
  accountName: string | null;
  businessType: string;
  phase: string;
  probability: number;
  expectedRevenue: number;
  weightedRevenue: number;
  owner: string | null;
  services: string | null;
  expectedCloseDate: string | null;
  nextActionDate: string | null;
  position: number;
};
