import { describe, expect, it } from "vitest";
import { parseMtgListProduct } from "./eumetsat";

describe("parseMtgListProduct", () => {
  it("normalise et filtre les pixels sur la France", () => {
    const csv = [
      "Latitude;Longitude;FRP;FRP_Uncertainty;Confidence",
      "44.84;-0.58;125.4;12;91",
      "10;20;500;20;99",
    ].join("\n");
    const incidents = parseMtgListProduct(csv, "2026-07-25T12:30:00.000Z");
    expect(incidents).toHaveLength(1);
    expect(incidents[0]).toMatchObject({
      latitude: 44.84,
      longitude: -0.58,
      radiativePowerMw: 125.4,
      confidence: "probable",
    });
  });

  it("refuse un schéma sans FRP", () => {
    expect(() => parseMtgListProduct("lat,lon\n44,-1", "2026-07-25T12:30:00.000Z"))
      .toThrow("schéma");
  });
});
