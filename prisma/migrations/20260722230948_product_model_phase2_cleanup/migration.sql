-- AlterTable: drop legacy columns now that data has been migrated to Product / productId
ALTER TABLE "Account" DROP COLUMN "products";

ALTER TABLE "DealLineItem" DROP COLUMN "productName";
