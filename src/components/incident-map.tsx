"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { CircleMarker, GeoJSON, MapContainer, Marker, Polygon, Polyline, Popup, Rectangle, TileLayer, Tooltip, useMap, useMapEvents, WMSTileLayer, ZoomControl } from "react-leaflet";
import { divIcon, type LatLng, type Marker as LeafletMarker, type Popup as LeafletPopup, type WMSParams } from "leaflet";
import { clusterDenseIncidents, clusterIncidents } from "@/domain/clustering";
import { distanceKm as distanceFrom, formatDistance } from "@/domain/distance";
import { observedActivityMovement, summarizeFireActivity } from "@/domain/fire-activity";
import { scoreFireEvent } from "@/domain/fire-event-confidence";
import { formatAge, getFreshness } from "@/domain/freshness";
import type { Incident } from "@/domain/models";
import type { OfficialNotice } from "@/domain/official-notice";
import type { NearbyPlace } from "@/domain/nearby-place";
import type { BdiffHistoricalPlace } from "@/integrations/bdiff";
import type { ForestWeatherZones } from "@/integrations/forest-weather";
import { communityReportStatus, type CommunityReport } from "@/domain/community-report";
import { loadCommunityMedia } from "@/domain/community-media";
import type { GeocodingSuggestion } from "@/integrations/geoplateforme";
import type { WindObservation } from "@/integrations/open-meteo";
import { perimeterContains, type EffisPerimeter } from "@/integrations/effis-perimeters";
import { selectBurnComparison, type BurnComparison, type SentinelScene } from "@/integrations/copernicus";
import { useLanguage } from "@/i18n/language-context";

const confidenceLabels = { confirmed: "confirmée", probable: "élevée", unverified: "non vérifiée" };
const freshnessLabels = { fresh: "récente", aging: "à surveiller", stale: "ancienne" };
const freshnessLabelsEnglish = { fresh: "recent", aging: "aging", stale: "old" };
const freshnessLabelsSpanish = { fresh: "reciente", aging: "vigilar", stale: "antigua" };
const activityTrendLabels = {
  rising: "en hausse",
  stable: "stable",
  falling: "en baisse",
  insufficient: "données insuffisantes",
};
const activityTrendLabelsEnglish = {
  rising: "rising",
  stable: "stable",
  falling: "falling",
  insufficient: "insufficient data",
};
const activityTrendLabelsSpanish = {
  rising: "en aumento",
  stable: "estable",
  falling: "en descenso",
  insufficient: "datos insuficientes",
};
const compassLabels = ["nord", "nord-est", "est", "sud-est", "sud", "sud-ouest", "ouest", "nord-ouest"] as const;
const compassLabelsEnglish = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"] as const;
const clusterRadiusByZoom: Record<number, number> = {
  5: 100,
  6: 70,
  7: 40,
  8: 20,
  9: 10,
  10: 5,
  11: 2,
};

const communityCategoryLabels = {
  flames: "Flammes visibles",
  smoke: "Fumée",
  road: "Route fermée",
  response: "Intervention des secours",
  evacuation: "Évacuation ou confinement",
  other: "Autre observation",
};
const communityStatusLabels = {
  new: "Non vérifié",
  supported: "Soutenu par la communauté",
  contested: "Contesté",
  expired: "Expiré",
};
const communityCategoryLabelsEnglish = {
  flames: "Visible flames",
  smoke: "Smoke",
  road: "Road closed",
  response: "Emergency response",
  evacuation: "Evacuation or shelter-in-place",
  other: "Other observation",
};
const communityStatusLabelsEnglish = {
  new: "Unverified",
  supported: "Community supported",
  contested: "Contested",
  expired: "Expired",
};
const forestDangerLabels = ["", "Faible", "Modéré", "Élevé", "Très élevé"];
const forestDangerColors = ["transparent", "#69a85e", "#e1c64a", "#ec8c32", "#d5382b"];
const communityActionBase =
  "flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-transparent px-2 py-1.5 text-[.69rem] font-[850] text-[#172322] shadow-[2px_2px_0_rgba(23,35,34,.1)] transition-none -rotate-[.3deg]";
const communityActionActive =
  "border-[#176f96] text-[#164e65] [background:repeating-linear-gradient(35deg,rgba(23,111,150,.05)_0_5px,rgba(23,111,150,.2)_5px_6px,transparent_6px_10px)]";
const communityDisputeBase =
  "rotate-[.35deg] rounded-[7px_11px_6px_10px] border-[#9b4a42] text-[#71342e]";
const communityDisputeActive =
  "[background:repeating-linear-gradient(35deg,rgba(138,62,54,.05)_0_5px,rgba(138,62,54,.2)_5px_6px,transparent_6px_10px)]";

function CommunityActionIcon({ kind }: { kind: "confirm" | "dispute" | "delete" }) {
  if (kind === "confirm") {
    return (
      <svg aria-hidden="true" className="size-4 shrink-0 text-[#168052]" fill="none" viewBox="0 0 24 24">
        <path d="m4.5 12.5 4.4 4.2L19.7 6.9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
      </svg>
    );
  }
  if (kind === "delete") {
    return (
      <svg aria-hidden="true" className="size-4 shrink-0 text-[#bd3026]" fill="none" viewBox="0 0 24 24">
        <path d="M5 7.2h14M9 4.5h6l.7 2.7M7.3 8.2l.8 11h7.8l.8-11M10.2 10.5v5.8M13.8 10.5v5.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className="size-4 shrink-0 text-[#dc711d]" fill="none" viewBox="0 0 24 24">
      <path d="M12 5.2v8.2M12 18.2v.2" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      <path d="M12 2.8c5.1 0 9.1 4 9.1 9.1S17.1 21 12 21s-9.1-4-9.1-9.1S6.9 2.8 12 2.8Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function pointOpacity(observedAt: string, referenceTime: number): number {
  const hours = Math.max(0, (referenceTime - new Date(observedAt).getTime()) / 3_600_000);
  return Math.max(0.3, 1 - hours / 32);
}

function activityColor(observedAt: string, referenceTime: number): string {
  const hours = Math.max(0, (referenceTime - new Date(observedAt).getTime()) / 3_600_000);
  if (hours <= 3) return "#ff002b";
  if (hours <= 6) return "#ff1234";
  return "#ed1b3a";
}

function pointRadius(incident: Incident): number {
  if (!incident.radiativePowerMw) return 5.5;
  return Math.min(10.5, 5.5 + Math.log10(Math.max(1, incident.radiativePowerMw)) * 1.8);
}

function formatAreaFromHectares(areaHectares: number, unit: "ha" | "km2", maximumFractionDigits = 1): string {
  if (unit === "km2") {
    return `${(areaHectares / 100).toLocaleString("fr-FR", { maximumFractionDigits })} km²`;
  }
  return `${areaHectares.toLocaleString("fr-FR", { maximumFractionDigits })} ha`;
}

function compassDirection(bearing: number, language: "en" | "fr" | "es" | "it" | "de" | "pt" | "nl" | "pl" | "ar" = "fr"): string {
  const index = Math.round(((bearing % 360) + 360) % 360 / 45) % compassLabels.length;
  if (language === "fr") return compassLabels[index];
  if (language === "es") return compassLabelsEnglish[index];
  if (language === "it") return compassLabelsEnglish[index];
  if (language === "de") return compassLabelsEnglish[index];
  if (language === "pt") return compassLabelsEnglish[index];
  if (language === "nl") return compassLabelsEnglish[index];
  if (language === "pl") return compassLabelsEnglish[index];
  if (language === "ar") return compassLabelsEnglish[index];
  return compassLabelsEnglish[index];
}

function movementBearing(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  return Math.atan2(to.longitude - from.longitude, to.latitude - from.latitude) * 180 / Math.PI;
}

function convexHull(points: Array<[number, number]>): Array<[number, number]> {
  if (points.length <= 3) return points;
  const sorted = [...points].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const cross = (origin: [number, number], a: [number, number], b: [number, number]) =>
    (a[1] - origin[1]) * (b[0] - origin[0]) - (a[0] - origin[0]) * (b[1] - origin[1]);
  const lower: Array<[number, number]> = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: Array<[number, number]> = [];
  for (const point of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, point) <= 0) upper.pop();
    upper.push(point);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function activityZones(incidents: Incident[]): Array<{ id: string; incidents: Incident[]; positions: Array<[number, number]> }> {
  return clusterDenseIncidents(incidents, 2.5, 3)
    .map((cluster) => {
      const padded = cluster.incidents.flatMap((incident) => {
        const latitudePadding = 0.0063;
        const longitudePadding = latitudePadding / Math.max(0.25, Math.cos((incident.latitude * Math.PI) / 180));
        return Array.from({ length: 8 }, (_, index): [number, number] => {
          const angle = index * Math.PI / 4;
          return [
            incident.latitude + Math.sin(angle) * latitudePadding,
            incident.longitude + Math.cos(angle) * longitudePadding,
          ];
        });
      });
      return { id: cluster.id, incidents: cluster.incidents, positions: convexHull(padded) };
    });
}

function BurnScarAnalysis({
  latitude,
  longitude,
  observedAt,
}: {
  latitude: number;
  longitude: number;
  observedAt: string;
}) {
  const { language, locale, t } = useLanguage();
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "ready"; comparison: BurnComparison }
  >({ status: "idle" });
  const [imageError, setImageError] = useState(false);

  const load = async () => {
    setState({ status: "loading" });
    setImageError(false);
    try {
      const parameters = new URLSearchParams({ lat: String(latitude), lon: String(longitude) });
      const response = await fetch(`/api/satellite/sentinel-2/scenes?${parameters}`);
      const payload = await response.json() as { message?: string; scenes?: SentinelScene[] };
      if (!response.ok) throw new Error(payload.message || t("incidentMap.theSentinel2CatalogIsNotResponding"));
      setState({ status: "ready", comparison: selectBurnComparison(payload.scenes ?? [], observedAt) });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : t("incidentMap.analysisUnavailable") });
    }
  };

  if (state.status === "idle") {
    return <button className="burn-analysis-button" onClick={() => void load()}>{t("incidentMap.compareBeforeAfterImages")}</button>;
  }
  if (state.status === "loading") return <p className="burn-analysis-status">{t("incidentMap.searchingForClearSentinel2Images")}</p>;
  if (state.status === "error") return <p className="burn-analysis-error">{state.message}</p>;
  if (state.comparison.status === "missing-before") {
    return <p className="burn-analysis-status">{t("incidentMap.noSufficientlyClearBeforeImageIsAvailableFrom")}</p>;
  }
  if (state.comparison.status === "waiting-after") {
    return <p className="burn-analysis-status">{t("incidentMap.aBeforeImageWasFoundAClearImage")}</p>;
  }
  const { before, after } = state.comparison;
  if (!before || !after) return null;
  const imageParameters = new URLSearchParams({
    beforeObservedAt: before.observedAt,
    lat: String(latitude),
    lon: String(longitude),
    mode: "burn",
    observedAt: after.observedAt,
  });
  return (
    <div className="burn-analysis-result">
      <strong>{t("incidentMap.sentinel2OpticalChange")}</strong>
      <small>
        {t("incidentMap.before")}: {new Date(before.observedAt).toLocaleDateString(locale)} · {t("incidentMap.after")}: {new Date(after.observedAt).toLocaleDateString(locale)}
      </small>
      {imageError
        ? <p className="burn-analysis-error">{t("incidentMap.theBeforeAfterRenderingIsUnavailableOrThe")}</p>
        : <Image
            alt={t("incidentMap.sentinel2SpectralDifferenceBeforeAndAfterThe")}
            height={512}
            onError={() => setImageError(true)}
            src={`/api/satellite/sentinel-2/image?${imageParameters}`}
            unoptimized
            width={512}
          />}
      <small>{t("incidentMap.coloredPixelsIndicateAChangeCompatibleWithA")}</small>
    </div>
  );
}

function DetectionLayers({
  areaUnit,
  dimIncidents,
  effisPerimeters,
  incidents,
  referenceTime,
  selectedLocation,
  showEffis,
  windObservations,
}: {
  areaUnit: "ha" | "km2";
  dimIncidents: boolean;
  effisPerimeters: EffisPerimeter[];
  incidents: Incident[];
  referenceTime: number;
  selectedLocation: GeocodingSuggestion | null;
  showEffis: boolean;
  windObservations: WindObservation[];
}) {
  const { language, t } = useLanguage();
  const ageLanguage: "en" | "fr" = language === "fr" ? "fr" : "en";
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  const initialBounds = map.getBounds().pad(0.25);
  const [visibleBounds, setVisibleBounds] = useState({
    south: initialBounds.getSouth(),
    west: initialBounds.getWest(),
    north: initialBounds.getNorth(),
    east: initialBounds.getEast(),
  });
  const visibleBoundsTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => {
    if (visibleBoundsTimerRef.current) clearTimeout(visibleBoundsTimerRef.current);
  }, []);
  useMapEvents({
    moveend: (event) => {
      if (visibleBoundsTimerRef.current) clearTimeout(visibleBoundsTimerRef.current);
      const targetMap = event.target;
      visibleBoundsTimerRef.current = setTimeout(() => {
        const bounds = targetMap.getBounds().pad(0.25);
        setVisibleBounds({ south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() });
      }, 200);
    },
    zoomend: (event) => {
      if (visibleBoundsTimerRef.current) clearTimeout(visibleBoundsTimerRef.current);
      const targetMap = event.target;
      visibleBoundsTimerRef.current = setTimeout(() => {
        setZoom(targetMap.getZoom());
        const bounds = targetMap.getBounds().pad(0.25);
        setVisibleBounds({ south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() });
      }, 200);
    },
  });
  const radiusKm = zoom >= 12 ? 0 : (clusterRadiusByZoom[zoom] ?? 150);
  const incidentsInView = useMemo(() => incidents.filter((incident) =>
    incident.latitude >= visibleBounds.south && incident.latitude <= visibleBounds.north
    && incident.longitude >= visibleBounds.west && incident.longitude <= visibleBounds.east),
  [incidents, visibleBounds]);
  const clusters = useMemo(() => clusterIncidents(incidentsInView, radiusKm), [incidentsInView, radiusKm]);
  const zones = useMemo(() => zoom >= 8 ? activityZones(incidentsInView) : [], [incidentsInView, zoom]);
  const today = new Date().toISOString().slice(0, 10);
  const effisParams: WMSParams & { time: string } = {
    layers: "modis.ba.poly.week",
    format: "image/png",
    transparent: true,
    time: today,
  };

  return (
    <>
      {showEffis && effisPerimeters.length === 0 && (
        <WMSTileLayer
          attribution='Périmètres estimés : <a href="https://forest-fire.emergency.copernicus.eu/">EFFIS / Union européenne</a>'
          opacity={0.55}
          params={effisParams}
          url="https://maps.effis.emergency.copernicus.eu/effis"
        />
      )}
      {showEffis && effisPerimeters.map((perimeter) => {
        const positions = perimeter.geometry.type === "Polygon"
          ? (perimeter.geometry.coordinates as number[][][]).map((ring) =>
              ring.map(([longitude, latitude]): [number, number] => [latitude, longitude]))
          : (perimeter.geometry.coordinates as number[][][][]).map((polygon) =>
              polygon.map((ring) => ring.map(([longitude, latitude]): [number, number] => [latitude, longitude])));
        return (
          <Polygon
            className="effis-vector-perimeter"
            key={perimeter.id}
            pathOptions={{ color: "#84291f", dashArray: "7 4", fillColor: "url(#effis-perimeter-hatch)", fillOpacity: 1, weight: 2 }}
            positions={positions}
          >
            <Tooltip sticky>
              {t("incidentMap.effisEstimatedBurnedArea")} · {formatAreaFromHectares(perimeter.areaHectares, areaUnit)}
            </Tooltip>
            <Popup>
              <small className="map-data-kind map-data-kind-official">{t("incidentMap.estimatedOfficialPerimeter")}</small>
              <div className="popup-title">{t("incidentMap.effisEstimatedBurnedArea")}</div>
              <p><strong>{t("incidentMap.approximately")} {formatAreaFromHectares(perimeter.areaHectares, areaUnit)}.</strong></p>
              {perimeter.province && <p>{perimeter.province}{perimeter.country ? ` · ${perimeter.country}` : ""}</p>}
              {perimeter.lastUpdatedAt && <p>{t("incidentMap.updated")}: {formatAge(perimeter.lastUpdatedAt, new Date(), ageLanguage)}.</p>}
              <p>{t("incidentMap.thisSatellitePerimeterRemainsAnEstimateAndMay")}</p>
              <small>{t("incidentMap.source")}: <a href={perimeter.sourceUrl} rel="noreferrer" target="_blank">{perimeter.sourceName}</a></small>
            </Popup>
          </Polygon>
        );
      })}
      {clusters.map((cluster) => {
        const newest = cluster.incidents.reduce((current, incident) =>
          incident.observedAt > current.observedAt ? incident : current,
        );
        const maximumPower = cluster.incidents.reduce(
          (maximum, incident) => Math.max(maximum, incident.radiativePowerMw ?? 0),
          0,
        );
        const freshnessStrength = 0.55 + pointOpacity(newest.observedAt, referenceTime) * 0.45;
        const strength = freshnessStrength * (dimIncidents ? 0.22 : 1);
        const radius = Math.min(
          82,
          34 + Math.log2(cluster.incidents.length + 1) * 7 + Math.log10(maximumPower + 1) * 6,
        );

        return (
          <Fragment key={`thermal-footprint-${cluster.id}`}>
            <CircleMarker
              className="thermal-footprint thermal-footprint-outer"
              center={[cluster.latitude, cluster.longitude]}
              fillColor="#ff002b"
              fillOpacity={0.22 * strength}
              interactive={false}
              pathOptions={{ stroke: false }}
              radius={radius}
            />
            <CircleMarker
              className="thermal-footprint thermal-footprint-middle"
              center={[cluster.latitude, cluster.longitude]}
              fillColor="#ff1234"
              fillOpacity={0.38 * strength}
              interactive={false}
              pathOptions={{ stroke: false }}
              radius={radius * 0.64}
            />
            <CircleMarker
              className="thermal-footprint thermal-footprint-core"
              center={[cluster.latitude, cluster.longitude]}
              fillColor="#ffccd5"
              fillOpacity={0.78 * strength}
              interactive={false}
              pathOptions={{ stroke: false }}
              radius={Math.max(6, radius * 0.22)}
            />
          </Fragment>
        );
      })}
      {zones.map((zone) => {
        const summary = summarizeFireActivity(zone.incidents, referenceTime);
        const movement = observedActivityMovement(zone.incidents, referenceTime);
        const directionBearing = movement ? movementBearing(movement.from, movement.to) : 0;
        const zoneCenter = {
          latitude: zone.positions.reduce((sum, point) => sum + point[0], 0) / zone.positions.length,
          longitude: zone.positions.reduce((sum, point) => sum + point[1], 0) / zone.positions.length,
        };
        const nearestWind = windObservations
          .map((observation) => ({ observation, distance: distanceFrom(zoneCenter, observation) }))
          .sort((a, b) => a.distance - b.distance)[0]?.observation;
        const windTowards = nearestWind ? (nearestWind.directionFromDegrees + 180) % 360 : null;
        const mappedPerimeter = effisPerimeters.find((perimeter) => perimeterContains(perimeter, zoneCenter));
        const eventConfidence = scoreFireEvent(zone.incidents, referenceTime, Boolean(mappedPerimeter));
        return (
          <Fragment key={`activity-${zone.id}`}>
          <Polygon
            interactive={false}
            pathOptions={{
              fillOpacity: 0,
              opacity: 0,
              weight: 0,
            }}
            positions={zone.positions}
          >
            <Tooltip className="zone-hover-card" sticky>
              <strong>🔥 {zone.incidents.length} signaux thermiques</strong>
              <span>Dernier : {formatAge(summary.latestObservedAt)}</span>
              {summary.radiativePowerMw !== null && <span>{t("incidentMap.observedIntensity")}: {Math.round(summary.radiativePowerMw)} MW</span>}
              {movement && movement.distanceKm >= 0.3 && (
                <span>↗ {t("incidentMap.apparentMovement")}: {compassDirection(directionBearing, language)}</span>
              )}
              {nearestWind && windTowards !== null && (
                <span>≋ Vent : {Math.round(nearestWind.speedKmh)} km/h vers {compassDirection(windTowards, language)}</span>
              )}
              <small>{t("incidentMap.combinedConfidence")}: {eventConfidence.score}/100 · {t("incidentMap.satelliteEstimate")}</small>
            </Tooltip>
            <Popup>
              <div className="popup-title">🔥 {t("incidentMap.observedThermalActivity")}</div>
              <p><strong>{zone.incidents.length} {t("incidentMap.signals")} · {t("incidentMap.latestDetection")} {formatAge(summary.latestObservedAt, new Date(), ageLanguage)}</strong></p>
              <p>{t("incidentMap.satelliteTrend")}: {language === "fr" ? activityTrendLabels[summary.trend] : language === "es" ? activityTrendLabelsSpanish[summary.trend] : language === "it" ? activityTrendLabelsEnglish[summary.trend] : language === "de" ? activityTrendLabelsEnglish[summary.trend] : language === "pt" ? activityTrendLabelsEnglish[summary.trend] : language === "nl" ? activityTrendLabelsEnglish[summary.trend] : activityTrendLabelsEnglish[summary.trend]} · {t("incidentMap.combinedConfidence2")} {eventConfidence.score}/100.</p>
              {summary.radiativePowerMw !== null && <p>{t("incidentMap.observedThermalIntensity")}: {Math.round(summary.radiativePowerMw)} MW.</p>}
              {movement && movement.distanceKm >= 0.3 ? (
                <p>
                  ↗ {t("incidentMap.apparentMovement")}: {compassDirection(directionBearing, language)} · {t("incidentMap.approximately2")}{" "}
                  {(movement.distanceKm / 3).toFixed(1)} km/h {t("incidentMap.betweenTwoGroupsOfDetections")}
                </p>
              ) : <p>{t("incidentMap.apparentMovementInsufficientData")}</p>}
              {nearestWind && windTowards !== null ? (
                <p>≋ {t("incidentMap.estimatedWind")}: {Math.round(nearestWind.speedKmh)} km/h {t("incidentMap.toward")} {compassDirection(windTowards, language)} · {t("incidentMap.gusts")} {Math.round(nearestWind.gustKmh)} km/h.</p>
              ) : <p>{t("incidentMap.windDataUnavailable")}</p>}
              {mappedPerimeter
                ? <p>{t("incidentMap.associatedEffisArea")}: {t("incidentMap.approximately2")} {Math.round(mappedPerimeter.areaHectares).toLocaleString(language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : language === "it" ? "it-IT" : language === "de" ? "de-DE" : language === "pt" ? "pt-PT" : language === "nl" ? "nl-NL" : "en-GB")} ha.</p>
                : <p>{t("incidentMap.burnedAreaCannotBeCalculatedFromTheseSignals")}</p>}
              <BurnScarAnalysis
                latitude={zoneCenter.latitude}
                longitude={zoneCenter.longitude}
                observedAt={summary.latestObservedAt}
              />
              {selectedLocation && (
                <p>
                  Distance de {selectedLocation.label} :{" "}
                  {formatDistance(distanceFrom(selectedLocation, zoneCenter))}.
                </p>
              )}
              <details className="popup-details">
                <summary>{t("incidentMap.understandThisEstimate")}</summary>
                <p>{t("incidentMap.signalsComparison", { recent: summary.recentDetections, previous: summary.previousDetections })}</p>
                <p>Score : {eventConfidence.reasons.join(" ")}</p>
                <p>{showEffis ? t("incidentMap.redEffisAreasAreDisplayedWhenAvailable") : t("incidentMap.estimatedEffisAreasAreHidden")}</p>
                <p>{t("incidentMap.movementComparesTwoSignalCentroidsThreeHoursApart")}</p>
                <p>{t("incidentMap.windIsAWeatherEstimateAt10M")}</p>
                <p>{t("incidentMap.hatchingDoesNotRepresentAConfirmedBurnedArea")}</p>
              </details>
            </Popup>
          </Polygon>
          {movement && movement.distanceKm >= 0.3 && (
            <>
              <Polyline
                interactive={false}
                pathOptions={{ color: activityColor(summary.latestObservedAt, referenceTime), dashArray: "5 5", weight: 4 }}
                positions={[
                  [movement.from.latitude, movement.from.longitude],
                  [movement.to.latitude, movement.to.longitude],
                ]}
              />
              <Marker
                icon={divIcon({
                  className: "movement-arrow-marker",
                  html: `<span style="transform:rotate(${directionBearing}deg)">↑</span>`,
                  iconAnchor: [12, 12],
                  iconSize: [24, 24],
                })}
                interactive={false}
                position={[movement.to.latitude, movement.to.longitude]}
              />
            </>
          )}
          </Fragment>
        );
      })}
      {clusters.map((cluster) => {
        if (cluster.incidents.length > 1) {
          const newest = cluster.incidents.reduce((current, incident) =>
            incident.observedAt > current.observedAt ? incident : current,
          );
          const markerSize = Math.min(52, 34 + Math.log2(cluster.incidents.length) * 3.5);
          const clusterIcon = divIcon({
            className: "fire-cluster-icon",
            html: `<span class="fire-cluster-center" style="--fire-point-color:${activityColor(newest.observedAt, referenceTime)}"><span class="fire-cluster-count">${cluster.incidents.length}</span></span>`,
            iconAnchor: [markerSize / 2, markerSize / 2],
            iconSize: [markerSize, markerSize],
          });
          return (
            <Marker
              icon={clusterIcon}
              eventHandlers={{ click: () => map.flyTo([cluster.latitude, cluster.longitude], Math.min(10, zoom + 2)) }}
              key={cluster.id}
              opacity={dimIncidents ? 0.34 : pointOpacity(newest.observedAt, referenceTime)}
              position={[cluster.latitude, cluster.longitude]}
            >
              <Tooltip>{t("incidentMap.clusterOf")} {cluster.incidents.length} {t("incidentMap.thermalDetections")}</Tooltip>
              <Popup>
                <div className="popup-title">{cluster.incidents.length} {t("incidentMap.clusteredSatelliteDetections")}</div>
                <p>{t("incidentMap.visualGroupingCalculatedAtThisZoomLevelNot")}</p>
                <p>{t("incidentMap.mostRecentDetection")}: {formatAge(newest.observedAt, new Date(), ageLanguage)}</p>
                <button className="secondary" onClick={() => map.flyTo([cluster.latitude, cluster.longitude], Math.min(11, zoom + 2))}>{t("incidentMap.viewDetections")}</button>
              </Popup>
            </Marker>
          );
        }
        const incident = cluster.incidents[0];
        const freshness = getFreshness(incident.observedAt);
        const opacity = pointOpacity(incident.observedAt, referenceTime) * (dimIncidents ? 0.32 : 1);
        const markerSize = Math.round(pointRadius(incident) * 2 + 12);
        const incidentIcon = divIcon({
          className: "fire-detection-icon",
          html: `<span class="fire-detection-spark" style="--fire-point-color:${activityColor(incident.observedAt, referenceTime)}"></span>`,
          iconAnchor: [markerSize / 2, markerSize / 2],
          iconSize: [markerSize, markerSize],
        });
        return (
          <Fragment key={incident.id}>
            <Marker
              icon={incidentIcon}
              opacity={opacity}
              position={[incident.latitude, incident.longitude]}
            >
              <Tooltip>{incident.title} · {formatAge(incident.observedAt, new Date(), ageLanguage)}</Tooltip>
              <Popup>
                <small className="map-data-kind map-data-kind-satellite">{t("incidentMap.satelliteDetection")}</small>
                <div className="popup-title">{t("incidentMap.heatDetectedHere")}</div>
                <p>{t("incidentMap.observedBySatellite")} {formatAge(incident.observedAt, new Date(), ageLanguage)}.</p>
                <p><strong>{t("incidentMap.thisSignalAloneDoesNotConfirmAWildfire")}</strong></p>
                <details className="popup-details">
                  <summary>{t("incidentMap.viewDetails")}</summary>
                  <p>{incident.description}</p>
                  <p>Confiance du signal : {confidenceLabels[incident.confidence]}</p>
                  <p>{t("incidentMap.recency")}: {language === "fr" ? freshnessLabels[freshness] : language === "es" ? freshnessLabelsSpanish[freshness] : language === "it" ? freshnessLabelsEnglish[freshness] : language === "de" ? freshnessLabelsEnglish[freshness] : language === "pt" ? freshnessLabelsEnglish[freshness] : language === "nl" ? freshnessLabelsEnglish[freshness] : freshnessLabelsEnglish[freshness]}</p>
                  <p>{t("incidentMap.burnedAreaUnknown")}</p>
                  {(incident.mergedDetectionCount ?? 1) > 1 && <p>{t("incidentMap.nearbyObservationsMerged", { count: incident.mergedDetectionCount ?? 1 })}</p>}
                  {incident.radiativePowerMw !== undefined && <p>Puissance radiative : {incident.radiativePowerMw} MW</p>}
                  <small>
                    Source : <a href={incident.sourceUrl} rel="noreferrer" target="_blank">{incident.sourceName}</a><br />
                    {t("incidentMap.observation")}: {new Date(incident.observedAt).toLocaleString(language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : language === "it" ? "it-IT" : language === "de" ? "de-DE" : language === "pt" ? "pt-PT" : language === "nl" ? "nl-NL" : "en-GB", { dateStyle: "short", timeStyle: "short" })}
                  </small>
                </details>
              </Popup>
            </Marker>
          </Fragment>
        );
      })}
    </>
  );
}

function SelectedLocation({
  kind,
  location,
  onCancel,
  onDrawArea,
  onDrawLine,
  onReport,
  zoom,
}: {
  kind: "search" | "geolocation" | "saved" | "pin";
  location: GeocodingSuggestion | null;
  onCancel: () => void;
  onDrawArea: (location: GeocodingSuggestion) => void;
  onDrawLine: (location: GeocodingSuggestion) => void;
  onReport: (location: GeocodingSuggestion) => void;
  zoom?: number;
}) {
  const { t } = useLanguage();
  const map = useMap();
  const markerRef = useRef<LeafletMarker | null>(null);
  const popupRef = useRef<LeafletPopup | null>(null);
  const closeSelection = () => {
    const popup = popupRef.current?.getElement();
    if (!popup) {
      onCancel();
      return;
    }
    const animation = popup.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: 180, easing: "ease-out", fill: "forwards" },
    );
    animation.onfinish = onCancel;
  };
  useMapEvents({
    dragstart: () => {
      if (kind === "pin") onCancel();
    },
  });
  useEffect(() => {
    if (!location) return;
    const shouldMoveMap = kind !== "pin" || zoom !== undefined;
    if (shouldMoveMap) map.flyTo([location.latitude, location.longitude], zoom ?? 14, { duration: 0.8 });
    const timer = window.setTimeout(() => markerRef.current?.openPopup(), shouldMoveMap ? 850 : 50);
    return () => window.clearTimeout(timer);
  }, [kind, location, map, zoom]);
  if (!location) return null;
  const geometryButtonClass = "flex min-h-[62px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px_7px_12px_8px] border-[1.6px] border-[#172322] bg-white px-1.5 py-2 text-[.68rem] font-black text-[#172322] shadow-[2px_2px_0_rgba(23,35,34,.16)]";
  return (
    <Marker
      bubblingMouseEvents={false}
      eventHandlers={{
        popupclose: () => onCancel(),
      }}
      icon={divIcon({
        className: "selected-location-marker",
        html: '<span aria-hidden="true">+</span>',
        iconAnchor: [17, 17],
        iconSize: [34, 34],
      })}
      position={[location.latitude, location.longitude]}
      ref={markerRef}
    >
      <Popup autoPan={false} className="selected-location-popup" closeButton={false} ref={popupRef}>
        <div className="relative">
          <div className="popup-title pr-14">
            <span className={kind === "pin" ? "block min-w-0 whitespace-nowrap max-[520px]:text-[.9rem] max-[520px]:tracking-[-.045em]" : "block min-w-0"}>
              {kind === "pin" ? (
                <>
                  <span className="max-[520px]:hidden">{location.label}</span>
                  <span className="hidden max-[520px]:inline">
                    {t("incidentMap.selectedPoint")} · {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </span>
                </>
              ) : location.label}
            </span>
          </div>
          <button
            aria-label={t("incidentMap.close")}
            className="absolute -top-2 -right-2 flex size-7 rotate-[.7deg] cursor-pointer items-center justify-center rounded-[51%_49%_46%_54%] border-[1.5px] border-[#172322] bg-white font-['Comic_Sans_MS','Bradley_Hand',cursive] text-base leading-none text-[#172322] max-[520px]:-top-1 max-[520px]:-right-1"
            onClick={(event) => {
              event.stopPropagation();
              closeSelection();
            }}
            type="button"
          >
            ×
          </button>
          <p>
            {kind === "geolocation"
              ? t("incidentMap.locationProvidedByThisDevice")
              : kind === "saved"
                ? t("incidentMap.placeSavedOnThisDevice")
                : kind === "pin"
                  ? t("incidentMap.pointSelectedManuallyOnTheMap")
                  : t("incidentMap.searchedPlace")}
            {" "}{t("incidentMap.itsPresenceOnTheMapDoesNotProvide")}
          </p>
          <div className="grid grid-cols-3 gap-2" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
            <button className={`${geometryButtonClass} rotate-[-.5deg]`} onClick={(event) => {
              event.stopPropagation();
              onReport(location);
            }} type="button">
              <span aria-hidden className="grid size-7 place-items-center rounded-[48%_52%_45%_55%] border-[1.5px] border-[#172322] text-lg leading-none text-[#d9482f]">＋</span>
              {t("incidentMap.point")}
            </button>
            <button className={`${geometryButtonClass} rotate-[.4deg] rounded-[8px_12px_7px_11px]`} onClick={(event) => {
              event.stopPropagation();
              onDrawArea(location);
            }} type="button">
              <svg aria-hidden className="size-7 overflow-visible" fill="none" viewBox="0 0 32 32">
                <path d="M6 8.5 24.5 5 27 24 9 27Z" fill="#f6f0df" stroke="#172322" strokeLinejoin="round" strokeWidth="1.8" />
                <path d="m8 12 7-5m-7 10L22 6M8.5 22 26 10M12 26l14-10M18 25l8-6" stroke="#52605d" strokeLinecap="round" strokeWidth="1.2" />
              </svg>
              {t("incidentMap.area")}
            </button>
            <button className={`${geometryButtonClass} rotate-[-.35deg]`} onClick={(event) => {
              event.stopPropagation();
              onDrawLine(location);
            }} type="button">
              <svg aria-hidden className="size-7 overflow-visible" fill="none" viewBox="0 0 32 32">
                <path d="M5 23 13 11l8 3 6-8" stroke="#172322" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <circle cx="5" cy="23" fill="#fff" r="2.7" stroke="#172322" strokeWidth="1.7" />
                <circle cx="13" cy="11" fill="#fff" r="2.7" stroke="#172322" strokeWidth="1.7" />
                <circle cx="21" cy="14" fill="#fff" r="2.7" stroke="#172322" strokeWidth="1.7" />
                <circle cx="27" cy="6" fill="#fff" r="2.7" stroke="#172322" strokeWidth="1.7" />
              </svg>
              {t("incidentMap.boundary")}
            </button>
          </div>
          <div className="mt-2">
            <button className="min-h-10 w-full cursor-pointer rotate-[.2deg] rounded-[9px_6px_11px_7px] border-[1.5px] border-[#172322] bg-transparent px-3 text-xs font-black shadow-[1px_1px_0_rgba(23,35,34,.12)]" onClick={(event) => {
              event.stopPropagation();
              closeSelection();
            }} type="button">{t("incidentMap.cancel")}</button>
          </div>
          {kind === "search" && <small>{t("incidentMap.addressSource")}: OpenStreetMap · Photon</small>}
        </div>
      </Popup>
    </Marker>
  );
}

function CommunityReportsLayer({
  reports,
  votes,
  onVote,
  onDelete,
}: {
  reports: CommunityReport[];
  votes: Record<string, -1 | 1>;
  onVote: (reportId: string, vote: -1 | 1) => void;
  onDelete: (reportId: string) => void;
}) {
  const { language, t } = useLanguage();
  return reports
    .filter((report) => communityReportStatus(report) !== "expired")
    .map((report) => {
      const status = communityReportStatus(report);
      const reporterAlias = (report.reporterAlias || (report.ownedByViewer ? t("incidentMap.me") : t("incidentMap.member")))
        .replace(/[^\p{L}\p{N} _-]/gu, "")
        .slice(0, 24) || t("incidentMap.member");
      const safePhotoUrl = report.mediaKind === "photo"
        && report.mediaUrl
        && /^https?:\/\//i.test(report.mediaUrl)
        ? report.mediaUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        : null;
      const mediaPreview = safePhotoUrl
        ? `<span class="community-media-preview"><img alt="" src="${safePhotoUrl}"></span>`
        : report.mediaKind === "video"
          ? `<span aria-hidden="true" class="community-media-preview community-video-preview"><span>▶</span></span>`
          : "";
      const coordinates = `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`;
      const icon = divIcon({
        className: `community-marker community-marker-${status}`,
        html: `<span class="community-author"><strong>${reporterAlias}</strong><small>${coordinates}</small></span><span class="community-marker-body"><span aria-hidden="true" class="community-cross">+</span>${mediaPreview}</span>`,
        iconAnchor: [56, 49],
        iconSize: [112, 68],
      });
      const direction = report.directionDegrees;
      const directionEnd = direction == null ? null : {
        latitude: report.latitude + Math.cos(direction * Math.PI / 180) * 0.018,
        longitude: report.longitude + Math.sin(direction * Math.PI / 180) * 0.018
          / Math.max(0.2, Math.cos(report.latitude * Math.PI / 180)),
      };
      return (
        <Fragment key={report.id}>
        {report.observedZone && report.observedZone.length >= 3 && (
          <Polygon
            className="community-observed-zone"
            pathOptions={{ color: "#d9482f", dashArray: "8 8", fillColor: "#ef6a52", fillOpacity: 0.16, weight: 3 }}
            positions={report.observedZone.map((point) => [point.latitude, point.longitude])}
          >
            <Tooltip className="zone-hover-card" direction="top">
              {t("incidentMap.userDrawnAreaUnverified")}
            </Tooltip>
          </Polygon>
        )}
        {report.observedZone && report.observedZone.length === 2 && (
          <Polyline
            className="community-direction-line"
            pathOptions={{ color: "#176f96", dashArray: "7 8", opacity: 0.9, weight: 3 }}
            positions={report.observedZone.map((point) => [point.latitude, point.longitude])}
          >
            <Tooltip className="zone-hover-card" direction="top">
              {t("incidentMap.userDrawnBoundaryUnverified")}
            </Tooltip>
          </Polyline>
        )}
        {directionEnd && (
          <Polyline
            className="community-direction-line"
            pathOptions={{ color: "#176f96", dashArray: "7 8", opacity: 0.9, weight: 3 }}
            positions={[[report.latitude, report.longitude], [directionEnd.latitude, directionEnd.longitude]]}
          >
            <Tooltip className="zone-hover-card" direction="top">
              {report.directionType === "smoke" ? t("incidentMap.reportedSmokeDirection") : t("incidentMap.reportedSpread")} · {t("incidentMap.unverified")}
            </Tooltip>
          </Polyline>
        )}
        <Marker icon={icon} position={[report.latitude, report.longitude]}>
          <Popup className="community-report-popup">
            <div className="community-popup">
              <small className="map-data-kind map-data-kind-community">{t("incidentMap.communityReport")}</small>
              <span className={`community-status community-status-${status}`}>{language === "fr" ? communityStatusLabels[status] : language === "es" ? communityStatusLabelsEnglish[status] : language === "it" ? communityStatusLabelsEnglish[status] : language === "de" ? communityStatusLabelsEnglish[status] : language === "pt" ? communityStatusLabelsEnglish[status] : language === "nl" ? communityStatusLabelsEnglish[status] : communityStatusLabelsEnglish[status]}</span>
              <div className="popup-title">{language === "fr" ? communityCategoryLabels[report.category] : language === "es" ? communityCategoryLabelsEnglish[report.category] : language === "it" ? communityCategoryLabelsEnglish[report.category] : language === "de" ? communityCategoryLabelsEnglish[report.category] : language === "pt" ? communityCategoryLabelsEnglish[report.category] : language === "nl" ? communityCategoryLabelsEnglish[report.category] : communityCategoryLabelsEnglish[report.category]}</div>
              <p>{t("incidentMap.communityObservationFrom")} {new Date(report.capturedAt).toLocaleString(language === "fr" ? "fr-FR" : language === "es" ? "es-ES" : language === "it" ? "it-IT" : language === "de" ? "de-DE" : language === "pt" ? "pt-PT" : language === "nl" ? "nl-NL" : "en-GB", { dateStyle: "short", timeStyle: "short" })}</p>
              {report.reportCount && report.reportCount > 1 && (
                <p><strong>{t("incidentMap.nearbyReportsGrouped", { count: report.reportCount })}</strong></p>
              )}
              {report.description && <p>{report.description}</p>}
              {direction != null && (
                <p><strong>{report.directionType === "smoke" ? t("incidentMap.smokeDirection") : t("incidentMap.observedSpread")}:</strong> {t("incidentMap.approximately2")} {direction}° · {t("incidentMap.communityIndication")}.</p>
              )}
              {(report.mediaKind === "photo" || report.mediaKind === "video") && report.mediaUrl && (
                <CommunityMedia kind={report.mediaKind} reference={report.mediaUrl} />
              )}
              {report.mediaKind !== "none" && report.mediaKind !== "photo" && report.mediaUrl && (
                <a className="secondary community-media-link" href={report.mediaUrl} rel="noreferrer" target="_blank">
                  {t("incidentMap.viewVideoOn")} {report.mediaKind === "tiktok" ? "TikTok" : report.mediaKind === "instagram" ? "Instagram" : t("incidentMap.sourceWebsite")}
                </a>
              )}
              <p className="community-vote-summary">
                {report.confirms} {t(report.confirms > 1 ? "incidentMap.confirmations" : "incidentMap.confirmation")} · {report.disputes} {t(report.disputes > 1 ? "incidentMap.disputes" : "incidentMap.dispute")}
              </p>
              <div className="m-0 grid grid-cols-2 gap-1.5">
                <button
                  aria-pressed={votes[report.id] === 1}
                  className={`${communityActionBase} ${votes[report.id] === 1 ? communityActionActive : ""}`}
                  onClick={() => onVote(report.id, 1)}
                  type="button"
                >
                  <CommunityActionIcon kind="confirm" />
                  {t("incidentMap.iConfirm")}
                </button>
                <button
                  aria-pressed={votes[report.id] === -1}
                  className={`${communityActionBase} ${communityDisputeBase} ${votes[report.id] === -1 ? communityDisputeActive : ""}`}
                  onClick={() => onVote(report.id, -1)}
                  type="button"
                >
                  <CommunityActionIcon kind="dispute" />
                  {t("incidentMap.iDispute")}
                </button>
              </div>
              {report.ownedByViewer && (
                <button className={`${communityActionBase} ${communityDisputeBase} w-full`} onClick={() => onDelete(report.id)} type="button">
                  <CommunityActionIcon kind="delete" />
                  {t("incidentMap.deleteMyReport")}
                </button>
              )}
              <small>
                {t("incidentMap.reportedLocation")}{report.accuracyMeters ? t("incidentMap.reportedAccuracy", { accuracy: report.accuracyMeters }) : ""}. {t("incidentMap.thisReportIsNotAnOfficialConfirmation")}
              </small>
            </div>
          </Popup>
        </Marker>
        </Fragment>
      );
    });
}

function CommunityMedia({ kind, reference }: { kind: "photo" | "video"; reference: string }) {
  const { t } = useLanguage();
  const [url, setUrl] = useState<string | null>(reference.startsWith("indexeddb:") ? null : reference);
  useEffect(() => {
    if (!reference.startsWith("indexeddb:")) return;
    let objectUrl: string | null = null;
    loadCommunityMedia(reference).then((blob) => {
      if (!blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => setUrl(null));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [reference]);
  if (!url) return <p className="layer-status">{t("incidentMap.loadingMedia")}</p>;
  if (kind === "video") {
    return <video className="community-video" controls playsInline preload="metadata" src={url} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={t("incidentMap.observationSubmittedByAUser")} className="community-photo" src={url} />;
}

export type MapViewport = {
  east: number;
  latitude: number;
  longitude: number;
  north: number;
  south: number;
  west: number;
  zoom: number;
};

function MapViewReporter({ onChange }: { onChange: (view: MapViewport) => void }) {
  const reportView = (map: ReturnType<typeof useMap>) => {
    const center = map.getCenter();
    const bounds = map.getBounds();
    onChange({
      east: Math.min(180, bounds.getEast()),
      latitude: center.lat,
      longitude: center.lng,
      north: Math.min(90, bounds.getNorth()),
      south: Math.max(-90, bounds.getSouth()),
      west: Math.max(-180, bounds.getWest()),
      zoom: map.getZoom(),
    });
  };
  const map = useMapEvents({
    moveend: () => reportView(map),
    zoomend: () => reportView(map),
  });
  useEffect(() => reportView(map), [map]);
  return null;
}

function MapClickSelector({
  disabled,
  onSelect,
}: {
  disabled: boolean;
  onSelect: (location: GeocodingSuggestion) => void;
}) {
  const { t } = useLanguage();
  useMapEvents({
    click: (event) => {
      if (disabled) return;
      onSelect({
        id: `map-pin-${event.latlng.lat.toFixed(6)}-${event.latlng.lng.toFixed(6)}`,
        label: `${t("incidentMap.selectedPoint")} · ${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)}`,
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
        kind: "pin",
      });
    },
  });
  return null;
}

function formatDms(value: number, positive: string, negative: string): string {
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesValue = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesValue);
  const seconds = (minutesValue - minutes) * 60;
  return `${degrees}° ${minutes}′ ${seconds.toFixed(1)}″ ${value >= 0 ? positive : negative}`;
}

function MouseCoordinates({ format }: { format: "decimal" | "dms" }) {
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  useMapEvents({
    click: (event) => setCoordinates({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
    mousemove: (event) => setCoordinates({ latitude: event.latlng.lat, longitude: event.latlng.lng }),
  });
  if (!coordinates) return null;
  return (
    <output
      data-testid="mouse-coordinates"
      className="pointer-events-none absolute bottom-4 left-3 z-[490] whitespace-nowrap text-[.68rem] font-extrabold tracking-[.01em] text-white [text-shadow:-1px_-1px_0_#263532,1px_-1px_0_#263532,-1px_1px_0_#263532,1px_1px_0_#263532] max-[720px]:bottom-[calc(73px+env(safe-area-inset-bottom))] max-[720px]:max-w-[calc(100%-12px)] max-[720px]:overflow-hidden max-[720px]:text-[.6rem] max-[720px]:text-ellipsis max-[520px]:hidden"
      aria-label="Coordonnées du pointeur"
    >
      {format === "dms"
        ? <>{formatDms(coordinates.latitude, "N", "S")} {formatDms(coordinates.longitude, "E", "O")}</>
        : <>{coordinates.latitude.toFixed(5)}°, {coordinates.longitude.toFixed(5)}°</>}
    </output>
  );
}

function measuredDistanceKm(points: LatLng[]): number {
  return points.slice(1).reduce((total, point, index) => total + points[index].distanceTo(point) / 1_000, 0);
}

function measuredAreaSquareKm(points: LatLng[]): number {
  if (points.length < 3) return 0;
  const earthRadiusMeters = 6_371_000;
  const averageLatitude = points.reduce((sum, point) => sum + point.lat, 0) / points.length * Math.PI / 180;
  const projected = points.map((point) => ({
    x: earthRadiusMeters * point.lng * Math.PI / 180 * Math.cos(averageLatitude),
    y: earthRadiusMeters * point.lat * Math.PI / 180,
  }));
  const doubledArea = projected.reduce((sum, point, index) => {
    const next = projected[(index + 1) % projected.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0);
  return Math.abs(doubledArea) / 2 / 1_000_000;
}

function measurementAction(event: { originalEvent: MouseEvent }): "accept" | "clear" | "finish" | null {
  const actionElement = event.originalEvent.composedPath().find(
    (item): item is HTMLElement => item instanceof HTMLElement && Boolean(item.dataset.measureAction),
  );
  const action = actionElement?.dataset.measureAction;
  return action === "accept" || action === "clear" || action === "finish" ? action : null;
}

function DistanceMeasureLayer({ active, onFinish, unit }: { active: boolean; onFinish: () => void; unit: "km" | "miles" }) {
  const { t } = useLanguage();
  const map = useMap();
  const [points, setPoints] = useState<LatLng[]>([]);
  const [cursorPoint, setCursorPoint] = useState<LatLng | null>(null);
  const [finished, setFinished] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const finishDistance = () => {
    if (points.length < 2) return;
    setCursorPoint(null);
    setFinished(true);
    onFinish();
  };

  useEffect(() => {
    if (!active) return;
    const finishWithKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || points.length < 2) return;
      event.preventDefault();
      setCursorPoint(null);
      setFinished(true);
      onFinish();
    };
    window.addEventListener("keydown", finishWithKeyboard);
    return () => window.removeEventListener("keydown", finishWithKeyboard);
  }, [active, onFinish, points.length]);

  useEffect(() => {
    if (!active) return;
    map.doubleClickZoom.disable();
    map.getContainer().classList.add("map-measuring");
    return () => {
      map.doubleClickZoom.enable();
      map.getContainer().classList.remove("map-measuring");
    };
  }, [active, map]);

  useMapEvents({
    click: (event) => {
      if (!active) return;
      if (measurementAction(event)) return;
      setPoints((current) => finished ? [event.latlng] : [...current, event.latlng]);
      setCursorPoint(event.latlng);
      setFinished(false);
      setAccepted(false);
    },
    dblclick: (event) => {
      if (!active) return;
      if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;
      setPoints((current) => {
        const deduplicated = current.filter((point, index) => index === 0 || current[index - 1].distanceTo(point) >= 1);
        if (deduplicated.length === 0) return [event.latlng];
        const last = deduplicated.at(-1)!;
        return last.distanceTo(event.latlng) < 1 ? deduplicated : [...deduplicated, event.latlng];
      });
      setCursorPoint(null);
      setFinished(true);
      if (points.length >= 1) onFinish();
    },
    mousemove: (event) => {
      if (active && !finished && points.length > 0) setCursorPoint(event.latlng);
    },
  });

  const previewPoints = active && !finished && cursorPoint && points.length > 0 ? [...points, cursorPoint] : points;
  const distance = measuredDistanceKm(previewPoints);
  const distanceLabel = unit === "miles"
    ? `${(distance * 0.621371).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} mi`
    : distance < 1 ? `${Math.round(distance * 1_000)} m` : `${distance.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
  const labelPosition = previewPoints.at(-1);
  const distanceLabelFacesLeft = labelPosition
    ? map.latLngToContainerPoint(labelPosition).x > map.getSize().x - 230
    : false;
  return (
    <>
      {previewPoints.length > 1 && (
        <Polyline
          interactive={false}
          pathOptions={{ className: "measurement-line", color: "#d9482f", dashArray: "7 6", lineCap: "round", weight: 3 }}
          positions={previewPoints.map((point) => [point.lat, point.lng])}
        />
      )}
      {points.map((point, index) => (
        <CircleMarker
          center={point}
          fillColor="#fffcef"
          fillOpacity={0.95}
          interactive={false}
          key={`${point.lat}-${point.lng}-${index}`}
          pathOptions={{ color: "#d9482f", weight: finished && index === points.length - 1 ? 2.5 : 2 }}
          radius={5}
        />
      ))}
      {previewPoints.length > 1 && labelPosition && (
        <Marker
          bubblingMouseEvents={false}
          eventHandlers={{ click: (event) => {
            event.originalEvent.preventDefault();
            event.originalEvent.stopPropagation();
            const action = measurementAction(event);
            if (action === "accept") {
              setAccepted(true);
              return;
            }
            if (action === "finish") {
              finishDistance();
              return;
            }
            if (action !== "clear") return;
            setPoints([]);
            setCursorPoint(null);
            setFinished(false);
            setAccepted(false);
            onFinish();
          } }}
          icon={divIcon({
            className: `measurement-label-marker measurement-label-${distanceLabelFacesLeft ? "left" : "right"}`,
            html: `<span><em>${distanceLabel}</em>${!finished ? `<b class="measurement-confirm measurement-drawing-action" data-measure-action="finish" title="${t("incidentMap.finishMeasurement")}">✓</b><b class="measurement-drawing-action" data-measure-action="clear" title="${t("incidentMap.cancelMeasurement")}">×</b>` : !accepted ? `<b class="measurement-confirm measurement-finished-action" data-measure-action="accept" title="${t("incidentMap.keepMeasurement")}">✓</b><b class="measurement-finished-action" data-measure-action="clear" title="${t("incidentMap.deleteMeasurement")}">×</b>` : ""}</span>`,
            iconAnchor: [0, 0],
            iconSize: [0, 0],
          })}
          interactive
          position={labelPosition}
        />
      )}
    </>
  );
}

function AreaMeasureLayer({
  active,
  closeShape = true,
  clearOnFinish = false,
  onCancel,
  onFinish,
  unit,
}: {
  active: boolean;
  closeShape?: boolean;
  clearOnFinish?: boolean;
  onCancel: () => void;
  onFinish: (points: Array<{ latitude: number; longitude: number }>) => void;
  unit: "ha" | "km2";
}) {
  const { t } = useLanguage();
  const map = useMap();
  const [points, setPoints] = useState<LatLng[]>([]);
  const [cursorPoint, setCursorPoint] = useState<LatLng | null>(null);
  const [finished, setFinished] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const minimumPoints = closeShape ? 3 : 2;

  useEffect(() => {
    if (!active) return;
    map.doubleClickZoom.disable();
    map.getContainer().classList.add("map-measuring");
    return () => {
      map.doubleClickZoom.enable();
      map.getContainer().classList.remove("map-measuring");
    };
  }, [active, map]);

  const finishArea = () => {
    if (points.length < minimumPoints) return;
    setCursorPoint(null);
    setFinished(true);
    onFinish(points.map((point) => ({ latitude: point.lat, longitude: point.lng })));
    if (clearOnFinish) {
      setPoints([]);
      setFinished(false);
    }
  };

  useEffect(() => {
    if (!active) return;
    const finishWithKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || points.length < minimumPoints) return;
      event.preventDefault();
      setCursorPoint(null);
      setFinished(true);
      onFinish(points.map((point) => ({ latitude: point.lat, longitude: point.lng })));
      if (clearOnFinish) {
        setPoints([]);
        setFinished(false);
      }
    };
    window.addEventListener("keydown", finishWithKeyboard);
    return () => window.removeEventListener("keydown", finishWithKeyboard);
  }, [active, clearOnFinish, minimumPoints, onFinish, points]);

  useMapEvents({
    click: (event) => {
      if (!active) return;
      if (measurementAction(event)) return;
      setPoints((current) => finished ? [event.latlng] : [...current, event.latlng]);
      setCursorPoint(event.latlng);
      setFinished(false);
      setAccepted(false);
    },
    dblclick: (event) => {
      if (!active) return;
      if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;
      setPoints((current) => {
        const deduplicated = current.filter((point, index) => index === 0 || current[index - 1].distanceTo(point) >= 1);
        if (deduplicated.length < 2) return deduplicated;
        const last = deduplicated.at(-1)!;
        return last.distanceTo(event.latlng) < 1 ? deduplicated : [...deduplicated, event.latlng];
      });
      setCursorPoint(null);
      if (points.length >= 2) {
        setFinished(true);
        onFinish(points.map((point) => ({ latitude: point.lat, longitude: point.lng })));
        if (clearOnFinish) {
          setPoints([]);
          setFinished(false);
        }
      }
    },
    mousemove: (event) => {
      if (active && !finished && points.length > 0) setCursorPoint(event.latlng);
    },
  });

  const previewPoints = active && !finished && cursorPoint && points.length > 0 ? [...points, cursorPoint] : points;
  const area = measuredAreaSquareKm(previewPoints);
  const labelPosition = previewPoints.reduce<LatLng | null>(
    (rightmost, point) => !rightmost || point.lng > rightmost.lng ? point : rightmost,
    null,
  );
  const areaLabelFacesLeft = labelPosition
    ? map.latLngToContainerPoint(labelPosition).x > map.getSize().x - 230
    : false;
  const areaLabel = area >= 1_000
    ? `${area.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km²`
    : unit === "ha"
    ? `${(area * 100).toLocaleString("fr-FR", { maximumFractionDigits: area < 1 ? 0 : 1 })} ha`
    : `${area.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km²`;

  return (
    <>
      {previewPoints.length > 1 && (closeShape ? (
        <Polygon
          interactive={false}
          pathOptions={{
            className: "area-measurement-shape",
            color: "#d9482f",
            dashArray: "8 5",
            fillColor: "#ef6a52",
            fillOpacity: previewPoints.length >= 3 ? 0.24 : 0,
            weight: 3,
          }}
          positions={previewPoints.map((point) => [point.lat, point.lng])}
        />
      ) : (
        <Polyline
          interactive={false}
          pathOptions={{ className: "area-measurement-shape", color: "#172322", dashArray: "8 5", weight: 3 }}
          positions={previewPoints.map((point) => [point.lat, point.lng])}
        />
      ))}
      {points.map((point, index) => (
        <CircleMarker
          bubblingMouseEvents={false}
          center={point}
          className={index === 0 ? "area-close-point" : undefined}
          eventHandlers={index === 0 ? { click: finishArea } : undefined}
          fillColor="#fffcef"
          fillOpacity={0.98}
          interactive={active && index === 0 && points.length >= minimumPoints && !finished}
          key={`${point.lat}-${point.lng}-${index}`}
          pathOptions={{ color: closeShape || finished ? "#d9482f" : "#172322", weight: 2 }}
          radius={index === 0 ? 6 : 5}
        />
      ))}
      {previewPoints.length >= minimumPoints && labelPosition && (
        <Marker
          bubblingMouseEvents={false}
          eventHandlers={{ click: (event) => {
            event.originalEvent.preventDefault();
            event.originalEvent.stopPropagation();
            const action = measurementAction(event);
            if (action === "accept") {
              setAccepted(true);
              return;
            }
            if (action === "finish") {
              finishArea();
              return;
            }
            if (action !== "clear") return;
            setPoints([]);
            setCursorPoint(null);
            setFinished(false);
            setAccepted(false);
            onCancel();
          } }}
          icon={divIcon({
            className: `measurement-label-marker area-measurement-label-marker measurement-label-${areaLabelFacesLeft ? "left" : "right"}`,
            html: `<span><em>${closeShape ? areaLabel : t("incidentMap.boundary")}</em>${!finished ? `<b class="measurement-confirm measurement-drawing-action" data-measure-action="finish" title="${t("incidentMap.finishDrawing")}">✓</b><b class="measurement-drawing-action" data-measure-action="clear" title="${t("incidentMap.cancelDrawing")}">×</b>` : !accepted ? `<b class="measurement-confirm measurement-finished-action" data-measure-action="accept" title="${t("incidentMap.keepDrawing")}">✓</b><b class="measurement-finished-action" data-measure-action="clear" title="${t("incidentMap.deleteDrawing")}">×</b>` : ""}</span>`,
            iconAnchor: [0, 0],
            iconSize: [0, 0],
          })}
          interactive
          position={labelPosition}
        />
      )}
    </>
  );
}

function WindLayer({ observations, unit }: { observations: WindObservation[]; unit: "kmh" | "knots" | "ms" }) {
  const map = useMap();
  const [viewRevision, setViewRevision] = useState(0);
  useMapEvents({
    moveend: () => setViewRevision((revision) => revision + 1),
    resize: () => setViewRevision((revision) => revision + 1),
    zoomend: () => setViewRevision((revision) => revision + 1),
  });
  const size = map.getSize();
  const spacing = 54;
  const phase = viewRevision % 2 === 0 ? 0 : 0.01;
  const arrows: Array<{ id: string; speed: number; direction: number; position: [number, number] }> = [];

  for (let y = spacing / 2; y < size.y; y += spacing) {
    for (let x = spacing / 2; x < size.x; x += spacing) {
      const location = map.containerPointToLatLng([x, y]);
      const nearest = observations
        .map((observation) => ({
          observation,
          distance:
            (observation.latitude - location.lat) ** 2
            + ((observation.longitude - location.lng) * Math.cos((location.lat * Math.PI) / 180)) ** 2,
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 4);
      let totalWeight = 0;
      let east = 0;
      let north = 0;
      let speed = 0;
      for (const item of nearest) {
        const weight = 1 / Math.max(0.04, item.distance);
        const bearing = ((item.observation.directionFromDegrees + 180) * Math.PI) / 180;
        east += Math.sin(bearing) * item.observation.speedKmh * weight;
        north += Math.cos(bearing) * item.observation.speedKmh * weight;
        speed += item.observation.speedKmh * weight;
        totalWeight += weight;
      }
      if (!totalWeight) continue;
      east /= totalWeight;
      north /= totalWeight;
      speed /= totalWeight;
      arrows.push({
        id: `wind-arrow-${x}-${y}-${viewRevision}`,
        speed,
        direction: (Math.atan2(east, north) * 180) / Math.PI,
        position: [location.lat + phase, location.lng],
      });
    }
  }

  return arrows.map((arrow, index) => {
    const duration = Math.max(0.65, Math.min(2, 2.2 - arrow.speed / 35));
    const delay = -((index % 7) / 7) * duration;
    const icon = divIcon({
      className: "wind-arrow-marker",
      html: `<span class="wind-arrow-direction" style="transform:rotate(${arrow.direction}deg)"><span class="wind-arrow-flow" style="animation-duration:${duration}s;animation-delay:${delay}s"><span class="wind-arrow-glyph">↑</span></span></span>`,
      iconAnchor: [13, 13],
      iconSize: [26, 26],
    });
    return (
      <Marker icon={icon} interactive={false} key={arrow.id} position={arrow.position}>
        <Tooltip>
          {unit === "ms"
            ? `${(arrow.speed / 3.6).toFixed(1)} m/s`
            : unit === "knots" ? `${Math.round(arrow.speed * 0.539957)} nd` : `${Math.round(arrow.speed)} km/h`}
        </Tooltip>
      </Marker>
    );
  });
}

export function IncidentMap({
  areaUnit,
  baseMap,
  communityReports,
  communityVotes,
  coordinateFormat,
  darkMap,
  distanceUnit,
  effisPerimeters,
  forestWeatherZones,
  historyPlaces,
  incidents,
  nearbyPlaces,
  officialNotices,
  measureArea,
  measureDistance,
  onCommunityVote,
  onCommunityDelete,
  onFinishAreaMeasure,
  onFinishDistanceMeasure,
  onReportZoneComplete,
  onClearSelection,
  onDrawReportArea,
  onDrawReportLine,
  onReportLocation,
  referenceTime,
  reportZoneDrawing,
  reportDrawingType,
  onMapSelect,
  onViewChange,
  selectedLocation,
  selectedLocationKind,
  selectedLocationZoom,
  showAirQuality,
  showEffis,
  showForest,
  showForestWeather,
  showHistory,
  showNearbyPlaces,
  showWind,
  windUnit,
  windObservations,
}: {
  areaUnit: "ha" | "km2";
  baseMap: "satellite" | "plan" | "terrain";
  communityReports: CommunityReport[];
  communityVotes: Record<string, -1 | 1>;
  coordinateFormat: "decimal" | "dms";
  darkMap: boolean;
  distanceUnit: "km" | "miles";
  effisPerimeters: EffisPerimeter[];
  forestWeatherZones: ForestWeatherZones | null;
  historyPlaces: BdiffHistoricalPlace[];
  incidents: Incident[];
  nearbyPlaces: NearbyPlace[];
  officialNotices: OfficialNotice[];
  measureArea: boolean;
  measureDistance: boolean;
  onCommunityVote: (reportId: string, vote: -1 | 1) => void;
  onCommunityDelete: (reportId: string) => void;
  onFinishAreaMeasure: () => void;
  onFinishDistanceMeasure: () => void;
  onReportZoneComplete: (points: Array<{ latitude: number; longitude: number }>) => void;
  onClearSelection: () => void;
  onDrawReportArea: (location: GeocodingSuggestion) => void;
  onDrawReportLine: (location: GeocodingSuggestion) => void;
  onReportLocation: (location: GeocodingSuggestion) => void;
  onMapSelect: (location: GeocodingSuggestion) => void;
  onViewChange: (view: MapViewport) => void;
  referenceTime: number;
  reportZoneDrawing: boolean;
  reportDrawingType: "area" | "line";
  selectedLocation: GeocodingSuggestion | null;
  selectedLocationKind: "search" | "geolocation" | "saved" | "pin";
  selectedLocationZoom?: number;
  showAirQuality: boolean;
  showEffis: boolean;
  showForest: boolean;
  showForestWeather: boolean;
  showHistory: boolean;
  showNearbyPlaces: boolean;
  showWind: boolean;
  windUnit: "kmh" | "knots" | "ms";
  windObservations: WindObservation[];
}) {
  return (
    <MapContainer
      bounds={[[41.1, -5.4], [51.3, 9.7]]}
      boundsOptions={{ padding: [28, 28] }}
      className="map h-full w-full z-[1]"
      zoomControl={false}
    >
      <ZoomControl position="bottomright" />
      <MapClickSelector disabled={measureDistance || measureArea || reportZoneDrawing} onSelect={onMapSelect} />
      <MouseCoordinates format={coordinateFormat} />
      <MapViewReporter onChange={onViewChange} />
      {darkMap ? (
        <>
          <TileLayer
            attribution='Carte sombre &copy; <a href="https://www.esri.com/">Esri</a>'
            className="dark-base-map-tiles"
            maxNativeZoom={16}
            maxZoom={19}
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            attribution="Frontières et noms : Esri"
            className="dark-reference-map-tiles"
            maxNativeZoom={16}
            maxZoom={19}
            pane="overlayPane"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          />
        </>
      ) : baseMap === "satellite" ? (
        <>
          <TileLayer
            attribution='Imagerie &copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics et communauté SIG'
            className="base-map-tiles"
            maxZoom={19}
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            attribution="Limites et noms : Esri"
            className="reference-map-tiles"
            maxZoom={19}
            pane="overlayPane"
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          />
        </>
      ) : baseMap === "plan" ? (
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          className="base-map-tiles"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      ) : (
        <TileLayer
          attribution='Carte &copy; <a href="https://opentopomap.org/">OpenTopoMap</a>, données &copy; OpenStreetMap'
          className="base-map-tiles"
          maxZoom={17}
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        />
      )}
      {showForest && (
        <WMSTileLayer
          attribution="Inventaire forestier &copy; IGN"
          format="image/png"
          layers="LANDCOVER.FORESTINVENTORY.V2"
          opacity={0.72}
          transparent
          url="https://data.geopf.fr/wms-r/wms"
          version="1.3.0"
        />
      )}
      {showAirQuality && <AirQualityGridLayer />}
      {showForestWeather && forestWeatherZones && (
        <GeoJSON
          data={forestWeatherZones}
          key={JSON.stringify(forestWeatherZones.features.map((feature) => [
            feature.properties.code,
            feature.properties.dayOneLevel,
          ]))}
          onEachFeature={(feature, layer) => {
            const department = feature.properties;
            layer.bindPopup(
              `<strong>${department.name} (${department.code})</strong>`
              + `<br>J+1 : ${forestDangerLabels[department.dayOneLevel]}`
              + `<br>J+2 : ${forestDangerLabels[department.dayTwoLevel]}`
              + "<br><small>Danger prévu par Météo-France · pas un feu actif</small>",
            );
          }}
          style={(feature) => {
            const level = feature?.properties.dayOneLevel ?? 1;
            return {
              color: forestDangerColors[level],
              fillColor: forestDangerColors[level],
              fillOpacity: level >= 3 ? 0.38 : 0.22,
              opacity: 0.85,
              weight: level >= 3 ? 2 : 1,
            };
          }}
        />
      )}
      {showHistory && <BdiffHistoryLayer areaUnit={areaUnit} places={historyPlaces} />}
      <DetectionLayers
        areaUnit={areaUnit}
        dimIncidents={measureDistance || measureArea || reportZoneDrawing}
        effisPerimeters={effisPerimeters}
        incidents={incidents}
        referenceTime={referenceTime}
        selectedLocation={selectedLocation}
        showEffis={showEffis}
        windObservations={windObservations}
      />
      {showWind && <WindLayer observations={windObservations} unit={windUnit} />}
      <DistanceMeasureLayer active={measureDistance} onFinish={onFinishDistanceMeasure} unit={distanceUnit} />
      <AreaMeasureLayer
        active={measureArea || reportZoneDrawing}
        closeShape={!reportZoneDrawing || reportDrawingType === "area"}
        clearOnFinish={reportZoneDrawing}
        onCancel={() => {
          if (reportZoneDrawing) onReportZoneComplete([]);
          else onFinishAreaMeasure();
        }}
        onFinish={(points) => {
          if (reportZoneDrawing) onReportZoneComplete(points);
          else onFinishAreaMeasure();
        }}
        unit={areaUnit}
      />
      <CommunityReportsLayer onDelete={onCommunityDelete} onVote={onCommunityVote} reports={communityReports} votes={communityVotes} />
      {showNearbyPlaces && <NearbyPlacesLayer places={nearbyPlaces} />}
      <OfficialNoticesLayer notices={officialNotices} />
      <SelectedLocation
        kind={selectedLocationKind}
        location={selectedLocation}
        onCancel={onClearSelection}
        onDrawArea={onDrawReportArea}
        onDrawLine={onDrawReportLine}
        onReport={onReportLocation}
        zoom={selectedLocationZoom}
      />
    </MapContainer>
  );
}

function BdiffHistoryLayer({ areaUnit, places }: { areaUnit: "ha" | "km2"; places: BdiffHistoricalPlace[] }) {
  const { t } = useLanguage();
  return places.map((place) => {
    const radius = Math.min(18, 6 + Math.log2(place.count + 1) * 3);
    return (
      <CircleMarker
        center={[place.latitude, place.longitude]}
        fillColor="#6f3f72"
        fillOpacity={0.52}
        key={`${place.year}-${place.communeCode}`}
        pathOptions={{ color: "#3f2347", dashArray: "4 3", weight: 2 }}
        radius={radius}
      >
        <Tooltip direction="top">
          <strong>{place.communeName}</strong>
          <span>{place.count} feu{place.count > 1 ? "x" : ""} · {formatAreaFromHectares(place.areaHectares, areaUnit)}</span>
        </Tooltip>
        <Popup>
          <article className="history-place-popup">
            <span>{t("incidentMap.fireHistory")} · {place.year}</span>
            <strong>{place.communeName}</strong>
            <p>{t(place.count > 1 ? "incidentMap.recordedFires" : "incidentMap.recordedFire", { count: place.count })}</p>
            <p>{formatAreaFromHectares(place.areaHectares, areaUnit, 2)} {t("incidentMap.affectedInTotal")}</p>
            <small>{t("incidentMap.bdiffAndOfficialSourcesMunicipalityLocationNotThe")}</small>
          </article>
        </Popup>
      </CircleMarker>
    );
  });
}

function nearbyLabel(category: string): string {
  if (category === "Centre de secours") return "Secours";
  if (category === "Établissement médico-social") return "Médico-social";
  if (category === "Station-service") return "Essence";
  return category;
}

function NearbyPlacesLayer({ places }: { places: NearbyPlace[] }) {
  const { t } = useLanguage();
  return places.map((place) => {
    const label = nearbyLabel(place.category);
    const width = Math.max(54, Math.min(100, 24 + label.length * 6.2));
    const icon = divIcon({
      className: "nearby-place-marker",
      html: `<span>${label}</span>`,
      iconAnchor: [width / 2, 15],
      iconSize: [width, 30],
    });
    return (
      <Marker icon={icon} key={place.id} position={[place.latitude, place.longitude]}>
        <Tooltip direction="top" offset={[0, -12]}>{place.name}</Tooltip>
        <Popup>
          <article className="nearby-place-popup">
            <span>{place.category}</span>
            <strong>{place.name}</strong>
            <p>{t("incidentMap.at")} {formatDistance(place.distanceKm)} {t("incidentMap.fromTheSearchedPoint")}</p>
            <small>{t("incidentMap.communityOpenstreetmapSourceVerifyLocallyBeforeMakingAny")}</small>
          </article>
        </Popup>
      </Marker>
    );
  });
}

type AirQualityCell = {
  aqi: number;
  east: number;
  north: number;
  observedAt?: string;
  pm10?: number;
  pm2_5?: number;
  south: number;
  west: number;
};

function airQualityColor(aqi: number): string {
  if (aqi <= 20) return "#50a95a";
  if (aqi <= 40) return "#e0bd39";
  if (aqi <= 60) return "#e88a32";
  if (aqi <= 80) return "#d94a3a";
  if (aqi <= 100) return "#8b4a91";
  return "#70253c";
}

function AirQualityGridLayer() {
  const { t } = useLanguage();
  const map = useMap();
  const [cells, setCells] = useState<AirQualityCell[]>([]);
  const [revision, setRevision] = useState(0);

  useMapEvents({
    moveend: () => setRevision((value) => value + 1),
    zoomend: () => setRevision((value) => value + 1),
  });

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const bounds = map.getBounds();
      const parameters = new URLSearchParams({
        east: String(bounds.getEast()),
        north: String(bounds.getNorth()),
        south: String(bounds.getSouth()),
        west: String(bounds.getWest()),
      });
      try {
        const response = await fetch(`/api/air-quality/grid?${parameters}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Grille indisponible");
        const payload = await response.json() as { cells?: AirQualityCell[] };
        setCells(payload.cells ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setCells([]);
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [map, revision]);

  return cells.map((cell, index) => (
    <Rectangle
      bounds={[[cell.south, cell.west], [cell.north, cell.east]]}
      fillColor={airQualityColor(cell.aqi)}
      fillOpacity={0.24}
      interactive
      key={`${index}-${cell.south}-${cell.west}`}
      pathOptions={{ color: airQualityColor(cell.aqi), opacity: 0.08, weight: 1 }}
    >
      <Tooltip className="air-quality-tooltip" sticky>
        <strong>{t("incidentMap.airQuality")}: {Math.round(cell.aqi)}</strong>
        <span>PM2.5 : {Number.isFinite(cell.pm2_5) ? `${Math.round(cell.pm2_5!)} µg/m³` : t("incidentMap.unavailable")}</span>
        <span>PM10 : {Number.isFinite(cell.pm10) ? `${Math.round(cell.pm10!)} µg/m³` : t("incidentMap.unavailable")}</span>
        <small>{t("incidentMap.camsEstimateGrid11Km")}</small>
      </Tooltip>
    </Rectangle>
  ));
}

function OfficialNoticesLayer({ notices }: { notices: OfficialNotice[] }) {
  const { t } = useLanguage();
  return notices.map((notice) => {
    const icon = divIcon({
      className: `official-notice-marker ${notice.severity}`,
      html: `<span aria-hidden="true">${notice.category === "evacuation" ? "!" : notice.category.includes("closure") ? "×" : "i"}</span>`,
      iconAnchor: [17, 17],
      iconSize: [34, 34],
    });
    return (
      <Marker icon={icon} key={notice.id} position={[notice.latitude, notice.longitude]}>
        <Popup>
          <article className={`official-notice popup ${notice.severity}`}>
            <span>{t("incidentMap.officialInformation")} · {notice.locationLabel}</span>
            <strong>{notice.title}</strong>
            <p>{notice.content}</p>
            {notice.instructions.length > 0 && (
              <ul>{notice.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ul>
            )}
            <a href={notice.sourceUrl} rel="noreferrer" target="_blank">Source : {notice.sourceName}</a>
          </article>
        </Popup>
      </Marker>
    );
  });
}
