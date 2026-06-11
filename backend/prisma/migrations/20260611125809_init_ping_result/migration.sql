-- CreateTable
CREATE TABLE "PingResult" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "retry" BOOLEAN NOT NULL DEFAULT false,
    "responseBody" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PingResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PingResult_requestId_key" ON "PingResult"("requestId");

-- CreateIndex
CREATE INDEX "PingResult_createdAt_idx" ON "PingResult"("createdAt");

-- CreateIndex
CREATE INDEX "PingResult_statusCode_idx" ON "PingResult"("statusCode");
