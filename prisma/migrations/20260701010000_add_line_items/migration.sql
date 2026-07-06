-- CreateTable
CREATE TABLE "DealLineItem" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billingType" TEXT NOT NULL DEFAULT '単発',
    "amount" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT '契約中',
    "churnDate" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DealLineItem_dealId_idx" ON "DealLineItem"("dealId");

-- AddForeignKey
ALTER TABLE "DealLineItem" ADD CONSTRAINT "DealLineItem_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

