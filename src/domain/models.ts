export type SourceType = "official" | "satellite" | "citizen";
export type Confidence = "confirmed" | "probable" | "unverified";
export type IncidentStatus = "active" | "contained" | "resolved" | "unknown";
export type ObservationStatus = "pending" | "verified" | "rejected" | "duplicate";
export type GeoPerimeter = { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };

export interface Traceability {
  sourceType: SourceType;
  sourceName: string;
  sourceUrl?: string;
  observedAt: string;
  updatedAt: string;
  ingestedAt?: string;
  confidence: Confidence;
}
export interface Incident extends Traceability {
  id: string; title: string; description?: string; latitude: number; longitude: number;
  perimeter?: GeoPerimeter; status: IncidentStatus; radiativePowerMw?: number;
  mergedDetectionCount?: number; sensorNames?: string[];
}
export interface Observation {
  id: string; latitude: number; longitude: number; imageUrl?: string; direction?: string;
  description?: string; status: ObservationStatus; createdAt: string; reviewedAt?: string;
  reviewNotes?: string; linkedIncidentId?: string;
}
export interface OfficialUpdate {
  id: string; title: string; content: string; sourceName: string; sourceUrl: string;
  territoryType: "commune" | "department" | "region" | "national" | "other";
  territoryValue: string;
  category: "evacuation" | "confinement" | "road" | "shelter" | "closure" | "information" | "other";
  status: "active" | "replaced" | "expired"; publishedAt: string; verifiedAt: string;
  expiresAt?: string; createdAt: string;
}
export interface SavedLocation {
  label: string; latitude: number; longitude: number; address?: string; createdAt: string;
}
export interface Shelter {
  id: string; name: string; latitude: number; longitude: number; address: string;
  status: "open" | "closed" | "unknown"; capacity?: number; sourceName: string;
  sourceUrl: string; updatedAt: string;
}
