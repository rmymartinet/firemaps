import type { Incident } from "./models";

export type EventConfidenceLevel = "high" | "medium" | "low";

export interface EventConfidence {
  level: EventConfidenceLevel;
  reasons: string[];
  score: number;
}

export function scoreFireEvent(
  incidents: Incident[],
  referenceTime: number,
  hasMappedPerimeter = false,
): EventConfidence {
  if (incidents.length === 0) return { level: "low", reasons: ["Aucun signal thermique."], score: 0 };

  const latestObservedAt = Math.max(...incidents.map((incident) => new Date(incident.observedAt).getTime()));
  const ageHours = Math.max(0, (referenceTime - latestObservedAt) / 3_600_000);
  const platforms = new Set(incidents.flatMap((incident) =>
    incident.sensorNames?.length ? incident.sensorNames : [incident.sourceName]));
  const probableCount = incidents.filter((incident) => incident.confidence === "probable" || incident.confidence === "confirmed").length;
  const observationBuckets = new Set(incidents.map((incident) =>
    Math.floor(new Date(incident.observedAt).getTime() / (3 * 3_600_000))));
  const hasFrp = incidents.some((incident) => (incident.radiativePowerMw ?? 0) > 0);

  let score = 0;
  const reasons: string[] = [];
  if (ageHours <= 3) {
    score += 30;
    reasons.push("Observation datant de moins de 3 h.");
  } else if (ageHours <= 6) {
    score += 18;
    reasons.push("Observation datant de moins de 6 h.");
  } else {
    reasons.push("Observation ancienne.");
  }
  if (platforms.size >= 2) {
    score += Math.min(22, 12 + platforms.size * 3);
    reasons.push(`${platforms.size} plateformes satellite ont observé la zone.`);
  } else {
    reasons.push("Une seule plateforme satellite disponible.");
  }
  if (incidents.length >= 6) {
    score += 15;
    reasons.push("Regroupement dense de signaux.");
  } else if (incidents.length >= 3) {
    score += 9;
    reasons.push("Plusieurs signaux sont regroupés.");
  }
  if (probableCount / incidents.length >= 0.6) {
    score += 12;
    reasons.push("Majorité de signaux à confiance élevée.");
  }
  if (observationBuckets.size >= 2) {
    score += 10;
    reasons.push("Activité observée sur plusieurs périodes.");
  }
  if (hasFrp) {
    score += 3;
    reasons.push("Puissance radiative disponible.");
  }
  if (hasMappedPerimeter) {
    score += 10;
    reasons.push("Périmètre de zone brûlée associé.");
  }

  const boundedScore = Math.min(100, score);
  return {
    level: boundedScore >= 75 ? "high" : boundedScore >= 45 ? "medium" : "low",
    reasons,
    score: boundedScore,
  };
}
