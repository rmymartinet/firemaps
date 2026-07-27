export type SentinelRenderMode = "natural" | "fire" | "burn";

export interface SentinelScene {
  id: string;
  observedAt: string;
  cloudCoverPercent: number | null;
}

export interface BurnComparison {
  after: SentinelScene | null;
  before: SentinelScene | null;
  status: "ready" | "waiting-after" | "missing-before";
}

interface StacFeature {
  id?: string;
  properties?: {
    datetime?: string;
    "eo:cloud_cover"?: number;
  };
}

interface StacResponse {
  features?: StacFeature[];
  value?: Array<{
    Id?: string;
    ContentDate?: { Start?: string };
    Attributes?: Array<{ Name?: string; Value?: number }>;
  }>;
}

const EVALSCRIPTS: Record<SentinelRenderMode, string> = {
  natural: `//VERSION=3
function setup(){return{input:["B02","B03","B04","dataMask"],output:{bands:4}}}
function evaluatePixel(s){return[2.5*s.B04,2.5*s.B03,2.5*s.B02,s.dataMask]}`,
  fire: `//VERSION=3
function setup(){return{input:["B04","B11","B12","dataMask"],output:{bands:4}}}
function evaluatePixel(s){return[3.2*s.B12,2.4*s.B11,2.2*s.B04,s.dataMask]}`,
  burn: `//VERSION=3
function setup(){return{
  input:[
    {datasource:"before",bands:["B08","B12","SCL","dataMask"]},
    {datasource:"after",bands:["B08","B12","SCL","dataMask"]}
  ],
  output:{bands:4}
}}
function clear(s){return s&&s.dataMask===1&&![3,8,9,10,11].includes(s.SCL)}
function evaluatePixel(samples){
  let b=samples.before[0],a=samples.after[0];
  if(!clear(b)||!clear(a))return[0,0,0,0];
  let nbrB=(b.B08-b.B12)/(b.B08+b.B12+0.0001);
  let nbrA=(a.B08-a.B12)/(a.B08+a.B12+0.0001);
  let d=nbrB-nbrA;
  if(d<0.1)return[0,0,0,0];
  if(d<0.27)return[1,0.82,0.12,0.48];
  if(d<0.44)return[1,0.38,0.05,0.66];
  return[0.82,0.05,0.03,0.78];
}`,
};

export function areaBounds(latitude: number, longitude: number, radiusKm = 1): [number, number, number, number] {
  const latitudeDelta = radiusKm / 111.32;
  const longitudeDelta = radiusKm / (111.32 * Math.max(0.2, Math.cos((latitude * Math.PI) / 180)));
  return [
    longitude - longitudeDelta,
    latitude - latitudeDelta,
    longitude + longitudeDelta,
    latitude + latitudeDelta,
  ];
}

export function normalizeScenes(payload: StacResponse): SentinelScene[] {
  const stacScenes = Array.isArray(payload.features) ? payload.features.flatMap((feature) => {
    const observedAt = feature.properties?.datetime;
    if (!feature.id || !observedAt || Number.isNaN(new Date(observedAt).getTime())) return [];
    const cloudCover = feature.properties?.["eo:cloud_cover"];
    return [{
      id: feature.id,
      observedAt,
      cloudCoverPercent: Number.isFinite(cloudCover) ? cloudCover! : null,
    }];
  }) : [];
  const odataScenes = Array.isArray(payload.value) ? payload.value.flatMap((product) => {
    const observedAt = product.ContentDate?.Start;
    if (!product.Id || !observedAt || Number.isNaN(new Date(observedAt).getTime())) return [];
    const cloudCover = product.Attributes?.find((attribute) => attribute.Name === "cloudCover")?.Value;
    return [{
      id: product.Id,
      observedAt,
      cloudCoverPercent: Number.isFinite(cloudCover) ? cloudCover! : null,
    }];
  }) : [];
  return [...stacScenes, ...odataScenes].sort((a, b) => b.observedAt.localeCompare(a.observedAt));
}

export function selectBurnComparison(
  scenes: SentinelScene[],
  eventObservedAt: string,
  maximumCloudCoverPercent = 40,
): BurnComparison {
  const eventTime = new Date(eventObservedAt).getTime();
  const margin = 6 * 3_600_000;
  const usable = scenes.filter((scene) =>
    scene.cloudCoverPercent === null || scene.cloudCoverPercent <= maximumCloudCoverPercent);
  const before = usable
    .filter((scene) => new Date(scene.observedAt).getTime() <= eventTime - margin)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0] ?? null;
  const after = usable
    .filter((scene) => new Date(scene.observedAt).getTime() >= eventTime + margin)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt))[0] ?? null;
  return {
    after,
    before,
    status: !before ? "missing-before" : !after ? "waiting-after" : "ready",
  };
}

export async function findSentinelScenes(latitude: number, longitude: number): Promise<SentinelScene[]> {
  const start = new Date(Date.now() - 60 * 86_400_000);
  const filter = [
    "Collection/Name eq 'SENTINEL-2'",
    "contains(Name,'MSIL2A')",
    `OData.CSC.Intersects(area=geography'SRID=4326;POINT(${longitude} ${latitude})')`,
    `ContentDate/Start gt ${start.toISOString()}`,
  ].join(" and ");
  const parameters = new URLSearchParams({
    "$filter": filter,
    "$orderby": "ContentDate/Start desc",
    "$top": "20",
    "$expand": "Attributes",
  });
  const response = await fetch(`https://catalogue.dataspace.copernicus.eu/odata/v1/Products?${parameters}`, {
    next: { revalidate: 3_600 },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`Catalogue Copernicus: HTTP ${response.status}`);
  return normalizeScenes(await response.json());
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.COPERNICUS_CLIENT_ID;
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("COPERNICUS_NOT_CONFIGURED");
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const response = await fetch(
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
    {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!response.ok) throw new Error(`Authentification Copernicus: HTTP ${response.status}`);
  const payload = await response.json() as { access_token?: string; expires_in?: number };
  if (!payload.access_token) throw new Error("Authentification Copernicus: jeton absent");
  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + Math.max(60, payload.expires_in ?? 600) * 1_000,
  };
  return cachedToken.value;
}

export async function renderSentinelImage({
  latitude,
  longitude,
  mode,
  beforeObservedAt,
  observedAt,
}: {
  latitude: number;
  longitude: number;
  mode: SentinelRenderMode;
  beforeObservedAt?: string;
  observedAt: string;
}): Promise<Response> {
  const token = await getAccessToken();
  const sceneTime = new Date(observedAt);
  const from = new Date(sceneTime.getTime() - 30 * 60_000).toISOString();
  const to = new Date(sceneTime.getTime() + 30 * 60_000).toISOString();
  const data = mode === "burn" && beforeObservedAt
    ? [
      {
        type: "sentinel-2-l2a",
        id: "before",
        dataFilter: {
          timeRange: {
            from: new Date(new Date(beforeObservedAt).getTime() - 30 * 60_000).toISOString(),
            to: new Date(new Date(beforeObservedAt).getTime() + 30 * 60_000).toISOString(),
          },
          mosaickingOrder: "mostRecent",
          maxCloudCoverage: 100,
        },
      },
      {
        type: "sentinel-2-l2a",
        id: "after",
        dataFilter: {
          timeRange: { from, to },
          mosaickingOrder: "mostRecent",
          maxCloudCoverage: 100,
        },
      },
    ]
    : [{
      type: "sentinel-2-l2a",
      dataFilter: {
        timeRange: { from, to },
        mosaickingOrder: "mostRecent",
        maxCloudCoverage: 100,
      },
    }];
  return fetch("https://sh.dataspace.copernicus.eu/process/v1", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify({
      input: {
        bounds: {
          bbox: areaBounds(latitude, longitude),
          properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" },
        },
        data,
      },
      output: {
        width: 512,
        height: 512,
        responses: [{ identifier: "default", format: { type: "image/png" } }],
      },
      evalscript: EVALSCRIPTS[mode],
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
}
