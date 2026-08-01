-- AlterTable
ALTER TABLE "CommunityVote" ADD COLUMN     "voterIpHash" VARCHAR(64);

-- CreateIndex
CREATE INDEX "CommunityVote_voterIpHash_createdAt_idx" ON "CommunityVote"("voterIpHash", "createdAt");
