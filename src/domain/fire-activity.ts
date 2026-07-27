import type { Incident } from "./models";

export type ActivityTrend = "rising" | "stable" | "falling" | "insufficient";
export type ActivityConfidence = "high" | "medium" | "low";

export interface FireActivitySummary {
  confidence: ActivityConfidence;
  latestObservedAt: string;
  radiativePowerMw: number | null;
  recentDetections: number;
  previousDetections: number;
  trend: ActivityTrend;
}

export interface ObservedMovement {
  from: { latitude: number; longitude: number };
  to: { latitude: number; longitude: number };
  distanceKm: number;
}

export function summarizeFireActivity(
  incidents: Incident[],
  referenceTime: number,
  bucketHours = 3,
): FireActivitySummary {
  if (incidents.length === 0) throw new Error("Une zone d’activité doit contenir au moins une détection.");
  const bucketMs = bucketHours * 3_600_000;
  const recentCutoff = referenceTime - bucketMs;
  const previousCutoff = referenceTime - bucketMs * 2;
  const recentDetections = incidents.filter((incident) => new Date(incident.observedAt).getTime() >= recentCutoff).length;
  const previousDetections = incidents.filter((incident) => {
    const observedAt = new Date(incident.observedAt).getTime();
    return observedAt >= previousCutoff && observedAt < recentCutoff;
  }).length;
  const comparable = recentDetections + previousDetections >= 3;
  const trend: ActivityTrend = !comparable
    ? "insufficient"
    : recentDetections >= Math.max(2, previousDetections * 1.35)
      ? "rising"
      : previousDetections >= Math.max(2, recentDetections * 1.35)
        ? "falling"
        : "stable";
  const latestObservedAt = incidents.reduce((latest, incident) =>
    incident.observedAt > latest ? incident.observedAt : latest, incidents[0].observedAt);
  const ageHours = Math.max(0, (referenceTime - new Date(latestObservedAt).getTime()) / 3_600_000);
  const confidence: ActivityConfidence = incidents.length >= 6 && ageHours <= 3
    ? "high"
    : incidents.length >= 3 && ageHours <= 6
      ? "medium"
      : "low";
  const powers = incidents
    .map((incident) => incident.radiativePowerMw)
    .filter((power): power is number => power !== undefined && Number.isFinite(power));
  return {
    confidence,
    latestObservedAt,
    radiativePowerMw: powers.length ? powers.reduce((sum, power) => sum + power, 0) : null,
    recentDetections,
    previousDetections,
    trend,
  };
}

export function observedActivityMovement(
  incidents: Incident[],
  referenceTime: number,
  bucketHours = 3,
): ObservedMovement | null {
  const recentCutoff = referenceTime - bucketHours * 3_600_000;
  const previousCutoff = referenceTime - bucketHours * 2 * 3_600_000;
  const recent = incidents.filter((incident) => new Date(incident.observedAt).getTime() >= recentCutoff);
  const previous = incidents.filter((incident) => {
    const observedAt = new Date(incident.observedAt).getTime();
    return observedAt >= previousCutoff && observedAt < recentCutoff;
  });
  if (recent.length < 2 || previous.length < 2) return null;
  const centroid = (items: Incident[]) => ({
    latitude: items.reduce((sum, incident) => sum + incident.latitude, 0) / items.length,
    longitude: items.reduce((sum, incident) => sum + incident.longitude, 0) / items.length,
  });
  const from = centroid(previous);
  const to = centroid(recent);
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLatitude = radians(to.latitude - from.latitude);
  const deltaLongitude = radians(to.longitude - from.longitude);
  const value = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(deltaLongitude / 2) ** 2;
  return { from, to, distanceKm: 6_371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)) };
}
