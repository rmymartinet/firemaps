import { describe, expect, it } from "vitest";
import { detectCoordinatedVoting } from "./coordinated-voting";

describe("detectCoordinatedVoting", () => {
  it("ne signale rien tant que le nombre de comptes distincts est sous le seuil", () => {
    const result = detectCoordinatedVoting({
      minimumDistinctVoters: 3,
      recentVotes: [{ voterId: "a" }, { voterId: "b" }],
    });

    expect(result.flagged).toBe(false);
    expect(result.distinctVoterCount).toBe(2);
  });

  it("signale dès que le nombre de comptes distincts atteint le seuil", () => {
    const result = detectCoordinatedVoting({
      minimumDistinctVoters: 3,
      recentVotes: [{ voterId: "a" }, { voterId: "b" }, { voterId: "c" }],
    });

    expect(result.flagged).toBe(true);
    expect(result.distinctVoterCount).toBe(3);
  });

  it("compte les comptes distincts, pas le nombre brut de votes", () => {
    const result = detectCoordinatedVoting({
      minimumDistinctVoters: 3,
      recentVotes: [{ voterId: "a" }, { voterId: "a" }, { voterId: "a" }, { voterId: "a" }],
    });

    expect(result.flagged).toBe(false);
    expect(result.distinctVoterCount).toBe(1);
  });
});
