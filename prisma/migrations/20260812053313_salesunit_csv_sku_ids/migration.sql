-- AlterTable
ALTER TABLE "SalesUnit" ADD COLUMN     "csvSkuIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
