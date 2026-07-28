export interface EmergencyNumber {
  countryCode: string;
  number: string;
  sourceName: string;
  sourceUrl: string;
}

export const EU_EMERGENCY_SOURCE_URL = "https://digital-strategy.ec.europa.eu/en/policies/112";
export const US_EMERGENCY_SOURCE_URL = "https://www.911.gov/";

export const EU_COUNTRY_CODES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DE", "DK", "EE",
  "ES", "FI", "FR", "GR", "HU", "IE", "IT", "LT", "LU",
  "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK",
] as const;

const EU_COUNTRIES = new Set<string>(EU_COUNTRY_CODES);

export function emergencyNumberForCountry(countryCode: string | null | undefined): EmergencyNumber | null {
  const normalizedCode = countryCode?.trim().toUpperCase();
  if (!normalizedCode) return null;

  if (normalizedCode === "US") {
    return {
      countryCode: normalizedCode,
      number: "911",
      sourceName: "National 911 Program",
      sourceUrl: US_EMERGENCY_SOURCE_URL,
    };
  }

  if (!EU_COUNTRIES.has(normalizedCode)) return null;

  return {
    countryCode: normalizedCode,
    number: "112",
    sourceName: "Union européenne",
    sourceUrl: EU_EMERGENCY_SOURCE_URL,
  };
}
