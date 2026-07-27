import type { Incident } from "./models";

export interface IncidentCluster {
  id: string;
  latitude: number;
  longitude: number;
  incidents: Incident[];
}

export function distanceKm(
  first: Pick<Incident, "latitude" | "longitude">,
  second: Pick<Incident, "latitude" | "longitude">,
): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLatitude = radians(second.latitude - first.latitude);
  const deltaLongitude = radians(second.longitude - first.longitude);
  const latitude1 = radians(first.latitude);
  const latitude2 = radians(second.latitude);
  const value = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
  return 6_371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function clusterIncidents(incidents: Incident[], radiusKm: number): IncidentCluster[] {
  if (radiusKm <= 0) {
    return incidents.map((incident) => ({
      id: incident.id,
      latitude: incident.latitude,
      longitude: incident.longitude,
      incidents: [incident],
    }));
  }
  const clusters: IncidentCluster[] = [];
  for (const incident of incidents) {
    const cluster = clusters.find((candidate) => distanceKm(candidate, incident) <= radiusKm);
    if (!cluster) {
      clusters.push({ id: incident.id, latitude: incident.latitude, longitude: incident.longitude, incidents: [incident] });
      continue;
    }
    cluster.incidents.push(incident);
    cluster.latitude = cluster.incidents.reduce((sum, item) => sum + item.latitude, 0) / cluster.incidents.length;
    cluster.longitude = cluster.incidents.reduce((sum, item) => sum + item.longitude, 0) / cluster.incidents.length;
    cluster.id = cluster.incidents.map((item) => item.id).sort().join("|");
  }
  return clusters;
}

export function clusterDenseIncidents(
  incidents: Incident[],
  radiusKm: number,
  minimumPoints = 3,
): IncidentCluster[] {
  const visited = new Set<number>();
  const assigned = new Set<number>();
  const clusters: IncidentCluster[] = [];
  const neighbors = (index: number) => incidents
    .map((incident, candidate) => ({ candidate, incident }))
    .filter(({ incident }) => distanceKm(incidents[index], incident) <= radiusKm)
    .map(({ candidate }) => candidate);

  for (let index = 0; index < incidents.length; index += 1) {
    if (visited.has(index)) continue;
    visited.add(index);
    const seedNeighbors = neighbors(index);
    if (seedNeighbors.length < minimumPoints) continue;
    const members = new Set<number>([index]);
    const queue = [...seedNeighbors];
    while (queue.length) {
      const candidate = queue.shift()!;
      members.add(candidate);
      if (!visited.has(candidate)) {
        visited.add(candidate);
        const candidateNeighbors = neighbors(candidate);
        if (candidateNeighbors.length >= minimumPoints) queue.push(...candidateNeighbors);
      }
    }
    const clusterIncidents = [...members]
      .filter((member) => !assigned.has(member))
      .map((member) => {
        assigned.add(member);
        return incidents[member];
      });
    if (clusterIncidents.length < minimumPoints) continue;
    clusters.push({
      id: clusterIncidents.map((incident) => incident.id).sort().join("|"),
      latitude: clusterIncidents.reduce((sum, incident) => sum + incident.latitude, 0) / clusterIncidents.length,
      longitude: clusterIncidents.reduce((sum, incident) => sum + incident.longitude, 0) / clusterIncidents.length,
      incidents: clusterIncidents,
    });
  }
  return clusters;
}
