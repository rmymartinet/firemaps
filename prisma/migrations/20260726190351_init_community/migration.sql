-- CreateEnum
CREATE TYPE "CommunityReportCategory" AS ENUM ('FLAMES', 'SMOKE', 'ROAD', 'RESPONSE', 'EVACUATION', 'OTHER');

-- CreateEnum
CREATE TYPE "CommunityReportModerationStatus" AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN', 'REJECTED');

-- CreateEnum
CREATE TYPE "CommunityMediaType" AS ENUM ('PHOTO', 'VIDEO', 'TIKTOK', 'INSTAGRAM', 'EXTERNAL_VIDEO');

-- CreateEnum
CREATE TYPE "CommunityMediaStatus" AS ENUM ('PENDING', 'READY', 'REJECTED', 'DELETED');

-- CreateTable
CREATE TABLE "CommunityReport" (
    "id" UUID NOT NULL,
    "category" "CommunityReportCategory" NOT NULL,
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "accuracyMeters" INTEGER,
    "capturedAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "moderationStatus" "CommunityReportModerationStatus" NOT NULL DEFAULT 'PENDING',
    "reporterId" VARCHAR(128),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CommunityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMedia" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "type" "CommunityMediaType" NOT NULL,
    "status" "CommunityMediaStatus" NOT NULL DEFAULT 'PENDING',
    "url" TEXT NOT NULL,
    "storageKey" VARCHAR(512),
    "mimeType" VARCHAR(128),
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CommunityMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityVote" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "voterId" VARCHAR(128) NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CommunityVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityReport_moderationStatus_expiresAt_idx" ON "CommunityReport"("moderationStatus", "expiresAt");

-- CreateIndex
CREATE INDEX "CommunityReport_latitude_longitude_idx" ON "CommunityReport"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "CommunityReport_createdAt_idx" ON "CommunityReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMedia_storageKey_key" ON "CommunityMedia"("storageKey");

-- CreateIndex
CREATE INDEX "CommunityMedia_reportId_status_idx" ON "CommunityMedia"("reportId", "status");

-- CreateIndex
CREATE INDEX "CommunityVote_reportId_value_idx" ON "CommunityVote"("reportId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityVote_reportId_voterId_key" ON "CommunityVote"("reportId", "voterId");

-- AddForeignKey
ALTER TABLE "CommunityMedia" ADD CONSTRAINT "CommunityMedia_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CommunityReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityVote" ADD CONSTRAINT "CommunityVote_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CommunityReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
