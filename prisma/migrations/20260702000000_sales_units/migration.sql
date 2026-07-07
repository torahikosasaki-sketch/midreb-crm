-- DropIndex
DROP INDEX "WeeklyProgress_weekLabel_idx";

-- AlterTable
ALTER TABLE "WeeklyProgress" DROP COLUMN "brand",
DROP COLUMN "gapToTarget",
DROP COLUMN "productSku",
DROP COLUMN "weekLabel",
ADD COLUMN     "salesUnitId" TEXT NOT NULL,
ADD COLUMN     "weekStart" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "SalesUnit" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "productSku" TEXT,
    "store" TEXT,
    "weeklyTarget" INTEGER,
    "status" TEXT NOT NULL DEFAULT '稼働中',
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesUnit_status_idx" ON "SalesUnit"("status");

-- CreateIndex
CREATE INDEX "WeeklyProgress_salesUnitId_idx" ON "WeeklyProgress"("salesUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyProgress_salesUnitId_weekStart_key" ON "WeeklyProgress"("salesUnitId", "weekStart");

-- AddForeignKey
ALTER TABLE "WeeklyProgress" ADD CONSTRAINT "WeeklyProgress_salesUnitId_fkey" FOREIGN KEY ("salesUnitId") REFERENCES "SalesUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

