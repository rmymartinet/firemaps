import { describe, expect, it } from "vitest";
import {
  normalizeFirmsDayRange,
  normalizeFirmsRows,
  parseFirmsCsv,
  serializeFirmsArea,
} from "./firms";

const csv = `latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
43.1234,5.4567,340.2,0.4,0.4,2026-07-25,0942,N20,VIIRS,h,2.0NRT,295.1,12.4,D`;

describe("NASA FIRMS", () => {
  it("parse les lignes CSV", () => {
    const rows = parseFirmsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].satellite).toBe("N20");
  });

  it("conserve l’heure d’acquisition distincte de l’ingestion", () => {
    const incidents = normalizeFirmsRows(parseFirmsCsv(csv), "VIIRS_NOAA20_NRT", "2026-07-25T10:00:00.000Z");
    expect(incidents[0]).toMatchObject({
      observedAt: "2026-07-25T09:42:00.000Z",
      updatedAt: "2026-07-25T09:42:00.000Z",
      ingestedAt: "2026-07-25T10:00:00.000Z",
      confidence: "probable",
    });
  });

  it("écarte une coordonnée invalide", () => {
    const rows = parseFirmsCsv(csv.replace("43.1234", "invalide"));
    expect(normalizeFirmsRows(rows, "VIIRS_NOAA20_NRT", "2026-07-25T10:00:00.000Z")).toEqual([]);
  });

  it("écarte une anomalie explicitement classée hors feu de végétation", () => {
    const rows = parseFirmsCsv("latitude,longitude,acq_date,acq_time,satellite,instrument,confidence,type\n44,-1,2026-07-25,1200,N20,VIIRS,h,2");
    expect(normalizeFirmsRows(rows, "VIIRS_NOAA20_NRT", "2026-07-25T13:00:00.000Z")).toEqual([]);
  });

  it("sérialise n’importe quelle zone visible du monde pour l’API FIRMS", () => {
    expect(serializeFirmsArea({
      east: 151.21531,
      north: -33.85671,
      south: -34.12542,
      west: 150.87654,
    })).toBe("150.8765,-34.1254,151.2153,-33.8567");
  });

  it("respecte la plage maximale de 5 jours acceptée par FIRMS", () => {
    expect(normalizeFirmsDayRange(8)).toBe(5);
    expect(normalizeFirmsDayRange(0)).toBe(1);
    expect(normalizeFirmsDayRange(3.6)).toBe(4);
  });
});
