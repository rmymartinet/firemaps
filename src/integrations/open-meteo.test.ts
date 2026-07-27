import { describe, expect, it } from "vitest";
import { normalizeWindResponse } from "./open-meteo";

describe("vent Open-Meteo", () => {
  it("normalise vitesse, direction et rafales", () => {
    expect(normalizeWindResponse([{
      latitude: 45,
      longitude: 2,
      current: { time: "2026-07-25T14:45", wind_speed_10m: 20, wind_direction_10m: 270, wind_gusts_10m: 35 },
    }])[0]).toMatchObject({ speedKmh: 20, directionFromDegrees: 270, gustKmh: 35, observedAt: "2026-07-25T14:45:00Z" });
  });
  it("écarte une valeur incomplète", () => {
    expect(normalizeWindResponse({ latitude: 45, longitude: 2, current: { time: "2026-07-25T14:45" } })).toEqual([]);
  });
});
