-- 顧客化フラグ追加
ALTER TABLE "Deal" ADD COLUMN "customerized" BOOLEAN NOT NULL DEFAULT false;

-- 旧「契約後」フェーズの商談を顧客化済みとしてマーク
UPDATE "Deal" SET "customerized" = true WHERE "phase" IN ('契約', 'オンボーディング', '運用中');

-- フェーズ名の再マッピング
UPDATE "Deal" SET "phase" = '提案済み'       WHERE "phase" = '提案';
UPDATE "Deal" SET "phase" = '口頭受注'       WHERE "phase" = '条件調整';
UPDATE "Deal" SET "phase" = '契約締結済み'   WHERE "phase" IN ('契約', 'オンボーディング', '運用中');
-- 初回接触 / 保留 / 失注 はそのまま
