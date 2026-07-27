import { describe, expect, it } from "vitest";
import { parseLatestForestWeather } from "./forest-weather";

describe("Météo des forêts", () => {
  it("conserve uniquement la dernière publication valide", () => {
    const parsed = parseLatestForestWeather(`date;num_dep;niveau_j1;niveau_j2;nom_dep
2026-07-24T15:00:00Z;33;2;3;Gironde
2026-07-25T15:00:00Z;33;3;4;Gironde
2026-07-25T15:00:00Z;40;2;3;Landes`);
    expect(parsed.publishedAt).toBe("2026-07-25T15:00:00Z");
    expect(parsed.departments).toEqual([
      { code: "33", name: "Gironde", dayOneLevel: 3, dayTwoLevel: 4 },
      { code: "40", name: "Landes", dayOneLevel: 2, dayTwoLevel: 3 },
    ]);
  });
});
