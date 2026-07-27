import { distanceKm } from "./clustering";
import type { Incident } from "./models";

export function deduplicateSatelliteIncidents(
  incidents: Incident[],
  radiusKm = 0.75,
  timeWindowMinutes = 15,
): Incident[] {
  const groups: Incident[][] = [];
  const sorted = [...incidents].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  for (const incident of sorted) {
    const observedAt = new Date(incident.observedAt).getTime();
    const group = groups.find((candidate) => candidate.some((member) =>
      Math.abs(observedAt - new Date(member.observedAt).getTime()) <= timeWindowMinutes * 60_000
      && distanceKm(member, incident) <= radiusKm));
    if (group) group.push(incident);
    else groups.push([incident]);
  }
  return groups.map((group) => {
    if (group.length === 1) return { ...group[0], mergedDetectionCount: 1, sensorNames: [group[0].sourceName] };
    const strongest = group.reduce((selected, incident) =>
      (incident.radiativePowerMw ?? -1) > (selected.radiativePowerMw ?? -1) ? incident : selected);
    const sensorNames = [...new Set(group.map((incident) => incident.sourceName))];
    return {
      ...strongest,
      id: `merged-${group.map((incident) => incident.id).sort().join("|")}`,
      title: "Détection thermique satellite fusionnée",
      description: `${group.length} observations très proches ont été fusionnées pour éviter un double comptage. ${strongest.description ?? ""}`.trim(),
      latitude: group.reduce((sum, incident) => sum + incident.latitude, 0) / group.length,
      longitude: group.reduce((sum, incident) => sum + incident.longitude, 0) / group.length,
      observedAt: group.reduce((latest, incident) => incident.observedAt > latest ? incident.observedAt : latest, group[0].observedAt),
      updatedAt: group.reduce((latest, incident) => incident.updatedAt > latest ? incident.updatedAt : latest, group[0].updatedAt),
      confidence: group.some((incident) => incident.confidence === "probable") ? "probable" : strongest.confidence,
      mergedDetectionCount: group.length,
      sensorNames,
    };
  });
}
