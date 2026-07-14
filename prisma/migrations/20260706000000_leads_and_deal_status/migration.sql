-- リード(Lead)追加 + 商談ステータス刷新 + Activityをリード対応

-- 1) Lead テーブル
CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "source" TEXT,
  "status" TEXT NOT NULL DEFAULT '未接触',
  "owner" TEXT,
  "nextActionDate" TIMESTAMP(3),
  "memo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Lead_accountId_idx" ON "Lead"("accountId");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) Deal.leadId（1:1）+ 初期フェーズ変更
ALTER TABLE "Deal" ADD COLUMN "leadId" TEXT;
CREATE UNIQUE INDEX "Deal_leadId_key" ON "Deal"("leadId");
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deal" ALTER COLUMN "phase" SET DEFAULT '初回商談予定';

-- 3) Activity をリード対応（dealId 任意化 + leadId 追加）
ALTER TABLE "Activity" ALTER COLUMN "dealId" DROP NOT NULL;
ALTER TABLE "Activity" ADD COLUMN "leadId" TEXT;
CREATE INDEX "Activity_leadId_idx" ON "Activity"("leadId");
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4) 既存フェーズ再マップ（既存商談は商談のまま維持）
UPDATE "Deal" SET "phase" = '初回商談予定' WHERE "phase" = '初回接触';
UPDATE "Deal" SET "phase" = '受注'         WHERE "phase" = '契約締結済み';
-- 提案済み / 口頭受注 / 契約書レビュー中 / 失注 / 保留 は同名維持
-- customerized は旧「契約締結済み」で true 済み → 新「受注」でも整合
