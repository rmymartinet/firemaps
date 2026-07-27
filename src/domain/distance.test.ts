import { describe, expect, it } from "vitest";
import { distanceKm, formatDistance } from "./distance";

describe("distanceKm", () => {
  it("calcule une distance géodésique cohérente", () => {
    expect(distanceKm(
      { latitude: 44.8378, longitude: -0.5792 },
      { latitude: 43.2965, longitude: 5.3698 },
    )).toBeCloseTo(506, -1);
  });

  it("formate les mètres et kilomètres", () => {
    expect(formatDistance(0.42)).toBe("420 m");
    expect(formatDistance(4.26)).toBe("4,3 km");
    expect(formatDistance(18.8)).toBe("19 km");
  });
});
