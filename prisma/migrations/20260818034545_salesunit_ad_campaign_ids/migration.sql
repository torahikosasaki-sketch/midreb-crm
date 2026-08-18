-- AlterTable
ALTER TABLE "SalesUnit" ADD COLUMN     "adCampaignIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
