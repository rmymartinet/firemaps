-- AlterTable
ALTER TABLE "CommunityReport"
ADD COLUMN "directionType" VARCHAR(32),
ADD COLUMN "directionDegrees" INTEGER,
ADD COLUMN "observedZone" JSONB;
