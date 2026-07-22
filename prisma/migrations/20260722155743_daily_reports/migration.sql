-- AlterTable
ALTER TABLE "SalesUnit" ADD COLUMN     "dailyAdBudget" INTEGER;

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL,
    "salesUnitId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "videoPosts" INTEGER,
    "liveCount" INTEGER,
    "adSpend" INTEGER,
    "adGmv" INTEGER,
    "orderCount" INTEGER,
    "dailyBudget" INTEGER,
    "shippingQty" INTEGER,
    "shippingAmount" INTEGER,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyReport_salesUnitId_idx" ON "DailyReport"("salesUnitId");

-- CreateIndex
CREATE INDEX "DailyReport_reportDate_idx" ON "DailyReport"("reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_salesUnitId_reportDate_key" ON "DailyReport"("salesUnitId", "reportDate");

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_salesUnitId_fkey" FOREIGN KEY ("salesUnitId") REFERENCES "SalesUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
