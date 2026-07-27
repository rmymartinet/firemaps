import { gunzipSync } from "node:zlib";
import type { Incident } from "@/domain/models";

const DIRECTORY_ROOT = "https://datalsasaf.lsasvcs.ipma.pt/PRODUCTS/MTG/MTFRPPixel/NATIVE";
const SOURCE_URL = "https://user.eumetsat.int/catalogue/EO:EUM:DAT:1156";
const FRANCE_BOUNDS = { west: -5.5, south: 41, east: 10, north: 51.5 };

export class MtgConfigurationError extends Error {}

function csvCells(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function normalizedHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findColumn(headers: string[], aliases: string[]): number {
  return headers.findIndex((header) => aliases.includes(normalizedHeader(header)));
}

function numberAt(cells: string[], index: number): number | undefined {
  if (index < 0) return undefined;
  const value = Number(cells[index]);
  return Number.isFinite(value) ? value : undefined;
}

export function parseMtgListProduct(csv: string, observedAt: string): Incident[] {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headerIndex = lines.findIndex((line) => /lat/i.test(line) && /lon/i.test(line));
  if (headerIndex < 0) throw new Error("Le fichier MTG-FRP ne contient pas d’en-tête latitude/longitude reconnu.");
  const delimiter = lines[headerIndex].includes(";") ? ";" : ",";
  const headers = csvCells(lines[headerIndex], delimiter);
  const latitudeIndex = findColumn(headers, ["lat", "latitude", "firelatitude"]);
  const longitudeIndex = findColumn(headers, ["lon", "long", "longitude", "firelongitude"]);
  const frpIndex = findColumn(headers, ["frp", "frpmw", "fireradiativepower"]);
  const uncertaintyIndex = findColumn(headers, ["frpuncertainty", "frpuncertaintymw", "uncertainty"]);
  const confidenceIndex = findColumn(headers, ["confidence", "confidencepercent", "fireconfidence"]);
  if (latitudeIndex < 0 || longitudeIndex < 0 || frpIndex < 0) {
    throw new Error("Le schéma du fichier MTG-FRP n’est pas reconnu.");
  }

  return lines.slice(headerIndex + 1).flatMap((line, index) => {
    const cells = csvCells(line, delimiter);
    const latitude = numberAt(cells, latitudeIndex);
    const longitude = numberAt(cells, longitudeIndex);
    const radiativePowerMw = numberAt(cells, frpIndex);
    if (
      latitude === undefined || longitude === undefined || radiativePowerMw === undefined
      || latitude < FRANCE_BOUNDS.south || latitude > FRANCE_BOUNDS.north
      || longitude < FRANCE_BOUNDS.west || longitude > FRANCE_BOUNDS.east
    ) return [];
    const uncertainty = numberAt(cells, uncertaintyIndex);
    const confidencePercent = numberAt(cells, confidenceIndex);
    return [{
      id: `mtg-frp-${observedAt}-${latitude.toFixed(4)}-${longitude.toFixed(4)}-${index}`,
      title: "Pixel thermique MTG-FRP",
      description: [
        "Détection géostationnaire à haute fréquence, d’une résolution nominale proche de 1 km.",
        uncertainty === undefined ? null : `Incertitude FRP : ${Math.round(uncertainty)} MW.`,
        confidencePercent === undefined ? null : `Confiance fournisseur : ${Math.round(confidencePercent)} %.`,
      ].filter(Boolean).join(" "),
      latitude,
      longitude,
      status: "unknown" as const,
      sourceType: "satellite" as const,
      sourceName: "EUMETSAT / LSA SAF · MTG-FRP (produit de démonstration)",
      sourceUrl: SOURCE_URL,
      observedAt,
      updatedAt: new Date().toISOString(),
      confidence: confidencePercent !== undefined && confidencePercent >= 80 ? "probable" as const : "unverified" as const,
      radiativePowerMw,
    }];
  });
}

function latestListProductLink(html: string): string | null {
  const links = [...html.matchAll(/href="([^"]*MTFRPPIXEL-ListProduct[^"]+\.csv\.gz)"/g)]
    .map((match) => match[1]);
  return links.sort().at(-1) ?? null;
}

function observationFromFilename(filename: string): string {
  const match = filename.match(/_(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})\.csv\.gz$/);
  if (!match) throw new Error("La date du produit MTG-FRP est illisible.");
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00.000Z`;
}

export async function fetchLatestMtgIncidents(now = new Date()): Promise<{
  incidents: Incident[];
  observedAt: string;
  productStatus: "fresh" | "delayed";
}> {
  const username = process.env.LSASAF_USERNAME;
  const password = process.env.LSASAF_PASSWORD;
  if (!username || !password) {
    throw new MtgConfigurationError(
      "Le produit MTG-FRP nécessite encore LSASAF_USERNAME et LSASAF_PASSWORD ; le jeton API EUMETSAT ne déverrouille pas ce serveur LSA SAF.",
    );
  }
  const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  let productUrl: URL | null = null;
  for (let daysAgo = 0; daysAgo <= 2 && !productUrl; daysAgo += 1) {
    const date = new Date(now.getTime() - daysAgo * 86_400_000);
    const year = String(date.getUTCFullYear());
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const directoryUrl = `${DIRECTORY_ROOT}/${year}/${month}/${day}/`;
    const directoryResponse = await fetch(directoryUrl, { next: { revalidate: 300 } });
    if (!directoryResponse.ok) continue;
    const link = latestListProductLink(await directoryResponse.text());
    if (link) productUrl = new URL(link, directoryUrl);
  }
  if (!productUrl) throw new Error("Aucun produit MTG-FRP récent n’est publié par LSA SAF.");
  const observedAt = observationFromFilename(productUrl.pathname);
  const productResponse = await fetch(productUrl, { headers: { authorization }, cache: "no-store" });
  if (productResponse.status === 401) throw new MtgConfigurationError("L’accès LSA SAF a été refusé. Vérifiez les identifiants LSA SAF.");
  if (!productResponse.ok) throw new Error(`Le téléchargement MTG-FRP a échoué (${productResponse.status}).`);
  const csv = gunzipSync(Buffer.from(await productResponse.arrayBuffer())).toString("utf8");
  const incidents = parseMtgListProduct(csv, observedAt);
  const ageMinutes = (now.getTime() - new Date(observedAt).getTime()) / 60_000;
  return { incidents, observedAt, productStatus: ageMinutes <= 60 ? "fresh" : "delayed" };
}
