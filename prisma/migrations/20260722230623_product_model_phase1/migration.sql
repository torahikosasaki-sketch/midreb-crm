-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_accountId_idx" ON "Product"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_accountId_name_key" ON "Product"("accountId", "name");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: DealLineItem
ALTER TABLE "DealLineItem" ADD COLUMN     "productId" TEXT;

-- CreateIndex
CREATE INDEX "DealLineItem_productId_idx" ON "DealLineItem"("productId");

-- AddForeignKey
ALTER TABLE "DealLineItem" ADD CONSTRAINT "DealLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: SalesUnit
ALTER TABLE "SalesUnit" ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "productId" TEXT;

-- CreateIndex
CREATE INDEX "SalesUnit_accountId_idx" ON "SalesUnit"("accountId");

-- CreateIndex
CREATE INDEX "SalesUnit_productId_idx" ON "SalesUnit"("productId");

-- AddForeignKey
ALTER TABLE "SalesUnit" ADD CONSTRAINT "SalesUnit_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesUnit" ADD CONSTRAINT "SalesUnit_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
