-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "products" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "DealLineItem" ADD COLUMN     "productName" TEXT;
