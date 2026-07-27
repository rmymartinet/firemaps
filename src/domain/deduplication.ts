import { distanceKm } from "./clustering";
import type { Incident } from "./models";

export function deduplicateSatelliteIncidents(
  incidents: Incident[],
  radiusKm = 0.75,
  timeWindowMinutes = 15,
): Incident[] {
  const groups: Incident[][] = [];
  const buckets = new Map<string, Set<number>>();
  const spatialCell = radiusKm / 111;
  const timeWindowMs = timeWindowMinutes * 60_000;
  const sorted = [...incidents].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  for (const incident of sorted) {
    const observedAt = new Date(incident.observedAt).getTime();
    const latitudeCell = Math.floor(incident.latitude / spatialCell);
    const longitudeCell = Math.floor(incident.longitude / spatialCell);
    const timeCell = Math.floor(observedAt / timeWindowMs);
    const longitudeRange = Math.min(12, Math.max(1, Math.ceil(1 / Math.max(0.12, Math.cos(incident.latitude * Math.PI / 180)))));
    const candidates = new Set<number>();
    for (let timeOffset = -1; timeOffset <= 1; timeOffset += 1) {
      for (let latitudeOffset = -1; latitudeOffset <= 1; latitudeOffset += 1) {
        for (let longitudeOffset = -longitudeRange; longitudeOffset <= longitudeRange; longitudeOffset += 1) {
          const key = `${timeCell + timeOffset}:${latitudeCell + latitudeOffset}:${longitudeCell + longitudeOffset}`;
          for (const index of buckets.get(key) ?? []) candidates.add(index);
        }
      }
    }
    const groupIndex = [...candidates].find((index) => groups[index].some((member) =>
      Math.abs(observedAt - new Date(member.observedAt).getTime()) <= timeWindowMs
      && distanceKm(member, incident) <= radiusKm));
    const resolvedGroupIndex = groupIndex ?? groups.length;
    if (groupIndex === undefined) groups.push([incident]);
    else groups[groupIndex].push(incident);
    const key = `${timeCell}:${latitudeCell}:${longitudeCell}`;
    const bucket = buckets.get(key) ?? new Set<number>();
    bucket.add(resolvedGroupIndex);
    buckets.set(key, bucket);
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
