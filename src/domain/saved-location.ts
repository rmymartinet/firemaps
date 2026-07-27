import type { SavedLocation } from "./models";

export const SAVED_LOCATION_KEY = "sentinel.saved-location.v1";

export function parseSavedLocation(value: string | null): SavedLocation | null {
  if (!value) return null;
  try {
    const candidate = JSON.parse(value) as Partial<SavedLocation>;
    if (
      typeof candidate.label !== "string"
      || !Number.isFinite(candidate.latitude)
      || !Number.isFinite(candidate.longitude)
      || typeof candidate.createdAt !== "string"
    ) return null;
    return {
      label: candidate.label,
      latitude: candidate.latitude!,
      longitude: candidate.longitude!,
      address: typeof candidate.address === "string" ? candidate.address : undefined,
      createdAt: candidate.createdAt,
    };
  } catch {
    return null;
  }
}
