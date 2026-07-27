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
  const cellSize = radiusKm / 111;
  const buckets = new Map<string, number[]>();
  const clusters: Array<IncidentCluster & { latitudeTotal: number; longitudeTotal: number }> = [];
  const bucketKey = (latitude: number, longitude: number) =>
    `${Math.floor(latitude / cellSize)}:${Math.floor(longitude / cellSize)}`;
  for (const incident of incidents) {
    const latitudeCell = Math.floor(incident.latitude / cellSize);
    const longitudeCell = Math.floor(incident.longitude / cellSize);
    const longitudeRange = Math.min(12, Math.max(1, Math.ceil(1 / Math.max(0.12, Math.cos(incident.latitude * Math.PI / 180)))));
    const candidates = new Set<number>();
    for (let latitudeOffset = -1; latitudeOffset <= 1; latitudeOffset += 1) {
      for (let longitudeOffset = -longitudeRange; longitudeOffset <= longitudeRange; longitudeOffset += 1) {
        for (const index of buckets.get(`${latitudeCell + latitudeOffset}:${longitudeCell + longitudeOffset}`) ?? []) {
          candidates.add(index);
        }
      }
    }
    const clusterIndex = [...candidates].find((index) => distanceKm(clusters[index], incident) <= radiusKm);
    const cluster = clusterIndex === undefined ? undefined : clusters[clusterIndex];
    if (!cluster) {
      const index = clusters.length;
      clusters.push({
        id: incident.id,
        latitude: incident.latitude,
        longitude: incident.longitude,
        latitudeTotal: incident.latitude,
        longitudeTotal: incident.longitude,
        incidents: [incident],
      });
      const key = bucketKey(incident.latitude, incident.longitude);
      const bucket = buckets.get(key) ?? [];
      bucket.push(index);
      buckets.set(key, bucket);
      continue;
    }
    const previousKey = bucketKey(cluster.latitude, cluster.longitude);
    cluster.incidents.push(incident);
    cluster.latitudeTotal += incident.latitude;
    cluster.longitudeTotal += incident.longitude;
    cluster.latitude = cluster.latitudeTotal / cluster.incidents.length;
    cluster.longitude = cluster.longitudeTotal / cluster.incidents.length;
    const nextKey = bucketKey(cluster.latitude, cluster.longitude);
    if (clusterIndex !== undefined && previousKey !== nextKey) {
      buckets.set(previousKey, (buckets.get(previousKey) ?? []).filter((index) => index !== clusterIndex));
      const nextBucket = buckets.get(nextKey) ?? [];
      nextBucket.push(clusterIndex);
      buckets.set(nextKey, nextBucket);
    }
  }
  return clusters.map(({ latitudeTotal: _latitudeTotal, longitudeTotal: _longitudeTotal, ...cluster }) => cluster);
}

export function clusterDenseIncidents(
  incidents: Incident[],
  radiusKm: number,
  minimumPoints = 3,
): IncidentCluster[] {
  if (radiusKm <= 0 || incidents.length === 0) return [];
  const visited = new Set<number>();
  const assigned = new Set<number>();
  const clusters: IncidentCluster[] = [];
  const cellSize = radiusKm / 111;
  const buckets = new Map<string, number[]>();
  incidents.forEach((incident, index) => {
    const key = `${Math.floor(incident.latitude / cellSize)}:${Math.floor(incident.longitude / cellSize)}`;
    const bucket = buckets.get(key) ?? [];
    bucket.push(index);
    buckets.set(key, bucket);
  });
  const neighbors = (index: number) => {
    const origin = incidents[index];
    const latitudeCell = Math.floor(origin.latitude / cellSize);
    const longitudeCell = Math.floor(origin.longitude / cellSize);
    const longitudeRange = Math.min(12, Math.max(1, Math.ceil(1 / Math.max(0.12, Math.cos(origin.latitude * Math.PI / 180)))));
    const matches: number[] = [];
    for (let latitudeOffset = -1; latitudeOffset <= 1; latitudeOffset += 1) {
      for (let longitudeOffset = -longitudeRange; longitudeOffset <= longitudeRange; longitudeOffset += 1) {
        for (const candidate of buckets.get(`${latitudeCell + latitudeOffset}:${longitudeCell + longitudeOffset}`) ?? []) {
          if (distanceKm(origin, incidents[candidate]) <= radiusKm) matches.push(candidate);
        }
      }
    }
    return matches;
  };

  for (let index = 0; index < incidents.length; index += 1) {
    if (visited.has(index)) continue;
    visited.add(index);
    const seedNeighbors = neighbors(index);
    if (seedNeighbors.length < minimumPoints) continue;
    const members = new Set<number>([index]);
    const queue = [...seedNeighbors];
    const queued = new Set(seedNeighbors);
    while (queue.length) {
      const candidate = queue.shift()!;
      members.add(candidate);
      if (!visited.has(candidate)) {
        visited.add(candidate);
        const candidateNeighbors = neighbors(candidate);
        if (candidateNeighbors.length >= minimumPoints) {
          for (const neighbor of candidateNeighbors) {
            if (!queued.has(neighbor)) {
              queued.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
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
      id: `dense-${clusterIncidents[0].id}-${clusterIncidents.length}`,
      latitude: clusterIncidents.reduce((sum, incident) => sum + incident.latitude, 0) / clusterIncidents.length,
      longitude: clusterIncidents.reduce((sum, incident) => sum + incident.longitude, 0) / clusterIncidents.length,
      incidents: clusterIncidents,
    });
  }
  return clusters;
}
