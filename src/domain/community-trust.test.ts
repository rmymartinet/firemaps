import { describe, expect, it } from "vitest";
import { computeCommunityTrustScore } from "./community-trust";

describe("computeCommunityTrustScore", () => {
  it("attribue un score bas à un compte tout juste créé sans historique", () => {
    const result = computeCommunityTrustScore({
      accountAgeDays: 0,
      emailVerified: false,
      publishedReports: 0,
      rejectedOrHiddenReports: 0,
      totalConfirms: 0,
      totalDisputes: 0,
    });

    expect(result.level).toBe("low");
    expect(result.score).toBe(20);
    expect(result.reasons).toContain("Adresse e-mail non vérifiée.");
    expect(result.reasons).toContain("Compte créé aujourd’hui.");
    expect(result.reasons).toContain("Aucun signalement publié pour l’instant.");
  });

  it("attribue un score élevé à un compte ancien, vérifié et bien noté", () => {
    const result = computeCommunityTrustScore({
      accountAgeDays: 120,
      emailVerified: true,
      publishedReports: 15,
      rejectedOrHiddenReports: 0,
      totalConfirms: 20,
      totalDisputes: 2,
    });

    expect(result.level).toBe("high");
    expect(result.score).toBe(100);
    expect(result.reasons).toContain("Adresse e-mail vérifiée.");
  });

  it("pénalise les signalements rejetés ou masqués sans jamais descendre sous zéro", () => {
    const result = computeCommunityTrustScore({
      accountAgeDays: 0,
      emailVerified: false,
      publishedReports: 0,
      rejectedOrHiddenReports: 10,
      totalConfirms: 0,
      totalDisputes: 10,
    });

    expect(result.score).toBe(0);
    expect(result.level).toBe("low");
    expect(result.reasons).toContain("10 signalements rejetés ou masqués par la modération.");
  });

  it("plafonne le score à 100 même avec un historique exceptionnel", () => {
    const result = computeCommunityTrustScore({
      accountAgeDays: 10_000,
      emailVerified: true,
      publishedReports: 500,
      rejectedOrHiddenReports: 0,
      totalConfirms: 500,
      totalDisputes: 0,
    });

    expect(result.score).toBe(100);
  });

  it("distingue un bilan de votes neutre d'un bilan sans aucun vote", () => {
    const noVotes = computeCommunityTrustScore({
      accountAgeDays: 5,
      emailVerified: true,
      publishedReports: 1,
      rejectedOrHiddenReports: 0,
      totalConfirms: 0,
      totalDisputes: 0,
    });
    const neutralVotes = computeCommunityTrustScore({
      accountAgeDays: 5,
      emailVerified: true,
      publishedReports: 1,
      rejectedOrHiddenReports: 0,
      totalConfirms: 3,
      totalDisputes: 3,
    });

    expect(noVotes.reasons).toContain("Pas encore de votes reçus.");
    expect(neutralVotes.reasons).toContain("Bilan des votes reçus neutre.");
  });
});
