-- Store only a keyed, irreversible IP fingerprint. Raw IP addresses are never persisted.
ALTER TABLE "CommunityReport"
ADD COLUMN "reporterIpHash" VARCHAR(64);

CREATE INDEX "CommunityReport_reporterId_createdAt_idx"
ON "CommunityReport"("reporterId", "createdAt");

CREATE INDEX "CommunityReport_reporterIpHash_createdAt_idx"
ON "CommunityReport"("reporterIpHash", "createdAt");
