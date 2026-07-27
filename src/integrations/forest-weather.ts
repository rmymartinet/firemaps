import type { FeatureCollection, Geometry } from "geojson";

export interface ForestWeatherDepartment {
  code: string;
  name: string;
  dayOneLevel: number;
  dayTwoLevel: number;
}

export type ForestWeatherZones = FeatureCollection<Geometry, ForestWeatherDepartment>;

export function parseLatestForestWeather(csv: string): {
  departments: ForestWeatherDepartment[];
  publishedAt: string | null;
} {
  const rows = csv.trim().split(/\r?\n/).slice(1).flatMap((line) => {
    const [date, code, today, tomorrow, name] = line.split(";");
    const dayOneLevel = Number(today);
    const dayTwoLevel = Number(tomorrow);
    if (
      !date || Number.isNaN(new Date(date).getTime()) || !code || !name
      || !Number.isInteger(dayOneLevel) || dayOneLevel < 1 || dayOneLevel > 4
      || !Number.isInteger(dayTwoLevel) || dayTwoLevel < 1 || dayTwoLevel > 4
    ) return [];
    return [{ date, code, name, dayOneLevel, dayTwoLevel }];
  });
  const publishedAt = rows.reduce<string | null>(
    (latest, row) => latest === null || row.date > latest ? row.date : latest,
    null,
  );
  return {
    departments: publishedAt === null
      ? []
      : rows.filter((row) => row.date === publishedAt).map((row) => ({
        code: row.code,
        name: row.name,
        dayOneLevel: row.dayOneLevel,
        dayTwoLevel: row.dayTwoLevel,
      })),
    publishedAt,
  };
}
