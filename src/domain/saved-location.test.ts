import { describe, expect, it } from "vitest";
import { parseSavedLocation } from "./saved-location";

describe("parseSavedLocation", () => {
  it("valide un lieu stocké", () => {
    expect(parseSavedLocation('{"label":"Bordeaux","latitude":44.84,"longitude":-0.58,"createdAt":"2026-07-25T00:00:00Z"}'))
      .toMatchObject({ label: "Bordeaux", latitude: 44.84 });
  });

  it("rejette un stockage invalide", () => {
    expect(parseSavedLocation('{"label":"Bordeaux"}')).toBeNull();
    expect(parseSavedLocation("invalide")).toBeNull();
  });
});
