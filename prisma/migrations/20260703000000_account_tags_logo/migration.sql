-- 1. 新カラム追加
ALTER TABLE "Account" ADD COLUMN "businessTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Account" ADD COLUMN "logoUrl" TEXT;

-- 2. 既存の単一値を配列へ移行
UPDATE "Account"
SET "businessTypes" = ARRAY["businessType"]
WHERE "businessType" IS NOT NULL AND "businessType" <> '';

-- 3. 旧カラム削除
ALTER TABLE "Account" DROP COLUMN "businessType";
