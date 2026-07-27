export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function distanceKm(from: Coordinates, to: Coordinates): number {
  const radiusKm = 6_371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function formatDistance(distance: number): string {
  if (distance < 1) return `${Math.round(distance * 1_000)} m`;
  if (distance < 10) return `${distance.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(distance)} km`;
}
