-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "businessType" TEXT,
    "targetTier" TEXT,
    "industry" TEXT,
    "region" TEXT,
    "owner" TEXT,
    "status" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "firstContactDate" TIMESTAMP(3),
    "salesTarget" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "businessType" TEXT NOT NULL,
    "phase" TEXT NOT NULL DEFAULT '初回接触',
    "probability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "services" TEXT,
    "expectedRevenue" INTEGER NOT NULL DEFAULT 0,
    "inflowChannel" TEXT,
    "agencyName" TEXT,
    "owner" TEXT,
    "expectedCloseDate" TIMESTAMP(3),
    "nextActionDate" TIMESTAMP(3),
    "chatTool" TEXT,
    "channelName" TEXT,
    "contractStatus" TEXT,
    "contractType" TEXT,
    "contractLink" TEXT,
    "memo" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Talent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "partner" TEXT,
    "store" TEXT,
    "memo" TEXT,

    CONSTRAINT "Talent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealTalent" (
    "dealId" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealTalent_pkey" PRIMARY KEY ("dealId","talentId")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "productSku" TEXT,
    "totalAssign" INTEGER,
    "totalSales" INTEGER,
    "totalRevenue" INTEGER,
    "videoPosts" INTEGER,
    "videoPosters" INTEGER,
    "videoSales" INTEGER,
    "videoGmv" INTEGER,
    "liveCount" INTEGER,
    "livePresenters" INTEGER,
    "liveSales" INTEGER,
    "liveGmv" INTEGER,
    "partner" TEXT,
    "margin" DOUBLE PRECISION,
    "store" TEXT,
    "campaignName" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyProgress" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "productSku" TEXT,
    "weekLabel" TEXT NOT NULL,
    "targetCount" INTEGER,
    "videoPosts" INTEGER,
    "videoPosters" INTEGER,
    "videoSales" INTEGER,
    "videoGmv" INTEGER,
    "liveCount" INTEGER,
    "livePresenters" INTEGER,
    "liveSales" INTEGER,
    "liveGmv" INTEGER,
    "gapToTarget" INTEGER,
    "activityNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "monthlyGmvTarget" INTEGER,
    "sellerTarget" INTEGER,
    "creatorTarget" INTEGER,
    "productionTarget" INTEGER,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deal_phase_idx" ON "Deal"("phase");

-- CreateIndex
CREATE INDEX "Deal_businessType_idx" ON "Deal"("businessType");

-- CreateIndex
CREATE INDEX "Deal_accountId_idx" ON "Deal"("accountId");

-- CreateIndex
CREATE INDEX "Activity_dealId_idx" ON "Activity"("dealId");

-- CreateIndex
CREATE INDEX "WeeklyProgress_weekLabel_idx" ON "WeeklyProgress"("weekLabel");

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealTalent" ADD CONSTRAINT "DealTalent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealTalent" ADD CONSTRAINT "DealTalent_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "Talent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

