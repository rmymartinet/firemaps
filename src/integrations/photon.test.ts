import { describe, expect, it } from "vitest";
import { normalizePhotonResponse } from "./photon";

describe("normalizePhotonResponse", () => {
  it("normalizes a worldwide Photon result", () => {
    expect(normalizePhotonResponse({
      features: [{
        geometry: { coordinates: [-74.006, 40.7128] },
        properties: {
          osm_id: 175905,
          osm_type: "R",
          type: "city",
          name: "New York",
          state: "New York",
          country: "United States",
        },
      }],
    })).toEqual([{
      id: "photon-R-175905",
      label: "New York, United States",
      city: undefined,
      postcode: undefined,
      latitude: 40.7128,
      longitude: -74.006,
      kind: "city",
    }]);
  });

  it("ignores malformed coordinates and empty labels", () => {
    expect(normalizePhotonResponse({
      features: [
        { geometry: { coordinates: [200, 40] }, properties: { name: "Invalid" } },
        { geometry: { coordinates: [2, 48] }, properties: {} },
      ],
    })).toEqual([]);
  });
});
