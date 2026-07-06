-- DropForeignKey
ALTER TABLE "DealTalent" DROP CONSTRAINT "DealTalent_dealId_fkey";

-- DropForeignKey
ALTER TABLE "DealTalent" DROP CONSTRAINT "DealTalent_talentId_fkey";

-- DropTable
DROP TABLE "Campaign";

-- DropTable
DROP TABLE "DealTalent";

-- DropTable
DROP TABLE "Talent";

