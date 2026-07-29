-- CreateTable
CREATE TABLE "ReportNote" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "refId" TEXT NOT NULL DEFAULT 'ALL',
    "periodKey" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportNote_scope_refId_idx" ON "ReportNote"("scope", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportNote_scope_refId_periodKey_key" ON "ReportNote"("scope", "refId", "periodKey");
