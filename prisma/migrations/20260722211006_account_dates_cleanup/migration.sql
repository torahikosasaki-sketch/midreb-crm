-- AlterTable
ALTER TABLE "Account" DROP COLUMN "targetTier",
DROP COLUMN "salesTarget",
ADD COLUMN     "contractDate" TIMESTAMP(3);
