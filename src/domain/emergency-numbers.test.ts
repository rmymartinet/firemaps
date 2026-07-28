import { describe, expect, it } from "vitest";
import { emergencyNumberForCountry } from "./emergency-numbers";

describe("emergencyNumberForCountry", () => {
  it("returns the verified European emergency number for an EU country", () => {
    expect(emergencyNumberForCountry("fr")).toMatchObject({ countryCode: "FR", number: "112" });
  });

  it("does not guess a number outside the verified directory", () => {
    expect(emergencyNumberForCountry("BR")).toBeNull();
    expect(emergencyNumberForCountry(null)).toBeNull();
  });

  it("returns 911 for the United States", () => {
    expect(emergencyNumberForCountry("US")).toMatchObject({ countryCode: "US", number: "911" });
  });
});
