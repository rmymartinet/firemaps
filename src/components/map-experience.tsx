"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { iso1A2Code } from "@rapideditor/country-coder";
import { distanceKm, formatDistance } from "@/domain/distance";
import { deduplicateSatelliteIncidents } from "@/domain/deduplication";
import {
  emergencyNumberForCountry,
  EU_COUNTRY_CODES,
} from "@/domain/emergency-numbers";
import { formatAge } from "@/domain/freshness";
import { clusterDenseIncidents } from "@/domain/clustering";
import { summarizeFireActivity } from "@/domain/fire-activity";
import type { Incident, SavedLocation } from "@/domain/models";
import type { OfficialNotice } from "@/domain/official-notice";
import type { NearbyPlace } from "@/domain/nearby-place";
import {
  applyCommunityVote,
  COMMUNITY_REPORTS_KEY,
  COMMUNITY_VOTES_KEY,
  parseCommunityReports,
  type CommunityReport,
} from "@/domain/community-report";
import { parseSavedLocation, SAVED_LOCATION_KEY } from "@/domain/saved-location";
import type { GeocodingSuggestion } from "@/integrations/geoplateforme";
import type { WindObservation } from "@/integrations/open-meteo";
import type { EffisPerimeter } from "@/integrations/effis-perimeters";
import type { BdiffHistoricalPlace } from "@/integrations/bdiff";
import type { ForestWeatherDepartment, ForestWeatherZones } from "@/integrations/forest-weather";
import { InformationContent } from "./information-content";
import { authClient } from "@/lib/auth-client";
import { useLanguage } from "@/i18n/language-context";
import { AuthAccountPanel } from "./auth-account-panel";
import { CommunityReportForm } from "./community-report-form";
import { MapSearch } from "./map-search";
import {
  defaultMapPreferences,
  MapSettingsPanel,
  type MapPreferences,
} from "./map-settings-panel";
import type { MapViewport } from "./incident-map";

const IncidentMap = dynamic(() => import("./incident-map").then((module) => module.IncidentMap), {
  ssr: false,
  loading: () => <div className="map empty-state">Chargement de la carte…</div>,
});

const ALERT_ENABLED_KEY = "sentinel.fire-alert.enabled.v1";
const ALERT_RADIUS_KEY = "sentinel.fire-alert.radius.v1";
const ALERT_CHECKED_AT_KEY = "sentinel.fire-alert.checked-at.v1";
const MAP_THEME_KEY = "sentinel.map-theme.v1";
const MAP_PREFERENCES_KEY = "sentinel.map-preferences.v1";

type BaseMap = "satellite" | "plan" | "terrain";
type LoadState =
  | { status: "loading"; incidents: Incident[] }
  | { status: "ready"; incidents: Incident[]; fetchedAt: string; partial: boolean }
  | { status: "error"; incidents: Incident[]; message: string };
type MapLoadNotice =
  | { kind: "hidden" | "searching" | "slow" | "empty" | "error" | "zoom" }
  | { kind: "success"; count: number };
type WindLoadState =
  | { status: "idle"; observations: WindObservation[] }
  | { status: "loading"; observations: WindObservation[] }
  | { status: "ready"; observations: WindObservation[]; fetchedAt: string }
  | { status: "error"; observations: WindObservation[]; message: string };
type ForestWeatherState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; departments: ForestWeatherDepartment[]; publishedAt: string; zones: ForestWeatherZones }
  | { status: "error" };

type SketchIconName = "account" | "air" | "area" | "danger" | "distance" | "exposed" | "fire" | "forest" | "history" | "information" | "layers" | "locate" | "map" | "more" | "now" | "official" | "pause" | "play" | "satellite" | "settings" | "share" | "sources" | "terrain" | "theme" | "watch" | "wind";

const sketchIconPaths: Record<SketchIconName, string[]> = {
  account: ["M12 3.2c2.5 0 4.3 1.9 4.2 4.4-.1 2.4-1.9 4.2-4.3 4.1-2.4-.1-4.1-1.9-4.1-4.3.1-2.4 1.9-4.2 4.2-4.2Z", "M4.7 20.2c.5-4.2 3.1-6.5 7.3-6.5 4.1 0 6.8 2.3 7.3 6.5"],
  air: ["M4 9.5c.5-2.3 2.2-3.7 4.4-3.5C9.5 3.8 13 3.1 15 5.4c2.8-.3 4.8 1.5 4.8 4.1", "M3 12.2h11.5c2.7 0 3.1 3.7.5 4-1.4.2-2.3-.7-2.5-1.7", "M4.2 16.8h5.3M3.2 19.5h9"],
  area: ["M5 6.5 10 3.8 19 7.2 17.8 18.5 7 19.5 4.5 12Z", "M7 9l9-2.2M6 12l11-2.7M6 15l10.5-2.5M8 18l8-2"],
  danger: ["M12.2 20.4c-3.6 0-6-2.1-5.9-5.3.1-2.3 1.5-3.6 3-5.4.2 1.5.7 2.2 1.4 2.7-.1-3 1.5-5.3 3.3-7 .2 2.5 2.4 3.7 3.2 6.1 1.6 4.3-.9 8.9-5 8.9Z", "M4.2 21h15.6", "M4.7 6.3 3.2 4.8M19.3 6.3l1.5-1.5M12 3V1.5"],
  distance: ["M4 17.5 9 8.5 19.5 5", "M4 17.5c-.8-1.2-.4-2.8.9-3.3 1.4-.5 2.8.5 2.8 2s-1.2 2.5-2.6 2.5", "M19.5 5c1.3.2 2.1 1.5 1.7 2.8-.5 1.4-2.1 2-3.3 1.2-1.2-.8-1.3-2.5-.3-3.5"],
  exposed: ["M3.5 11.2 8 7.4l4.5 3.8v8H3.5Z", "M11.5 9.3 15.5 6l5 4.2v9h-8", "M6.2 19.2v-4.5h3v4.5M15.2 19.2v-4.1h2.8v4.1"],
  fire: ["M12.2 21c-4.2 0-7.1-2.6-7-6.4.1-2.8 1.7-4.4 3.6-6.6.3 2 .9 2.9 1.7 3.5-.2-3.8 1.8-6.5 4-8.5.2 3.1 2.8 4.5 3.8 7.4 1.9 5.2-1 10.6-6.1 10.6Z", "M12.1 19c-1.8 0-3.2-1.2-3.1-3 .1-1.4.9-2.3 2-3.4.1 1 .5 1.6 1 2 .1-1.8.9-3.1 2-4.1.2 1.6 1.4 2.4 1.6 3.9.4 2.5-1 4.6-3.5 4.6Z"],
  forest: ["M12 3.2 6.2 11h3L5 16.5h5.2v4.2h3.6v-4.2H19L14.8 11h3Z", "M12 7.2v9.3M8.5 12.8h7"],
  history: ["M5.1 7.2H2.8V4.9", "M4.2 6.2A8.6 8.6 0 1 1 3.7 16", "M12 7v5.2l3.6 2.1"],
  information: ["M12 10.3v7.2", "M11.8 6.3h.2", "M12 2.8c5.1 0 9.1 4.1 9 9.2-.1 5.2-4.1 9.1-9.2 9-5.2-.1-9-4.2-8.8-9.3.1-5 4-8.9 9-8.9Z"],
  layers: ["M4 7.5 12 3l8 4.5-8 4.3Z", "M5 11.3 12 15l7-3.7", "M5 15.2 12 19l7-3.8"],
  locate: ["M12 3v4M12 17v4M3 12h4M17 12h4", "M12 7.2c2.8 0 5 2.2 5 4.9-.1 2.8-2.3 4.9-5.1 4.8-2.7-.1-4.8-2.3-4.7-5 .1-2.7 2.2-4.7 4.8-4.7Z", "M12 10.4c1 0 1.8.8 1.8 1.8S13 14 12 14s-1.8-.8-1.8-1.8.8-1.8 1.8-1.8Z"],
  map: ["M3.5 5.5 9 3.7l6 2 5.5-1.8v14.6L15 20.3l-6-2-5.5 1.8Z", "M9 3.7v14.6M15 5.7v14.6", "M5.5 9.2 8 8.4M16.8 9.2l2-.7M10.8 12.2l2.6.9"],
  more: ["M5 12h.2M11.9 12h.2M18.8 12h.2"],
  now: ["M5.5 5.2 16.8 12 5.5 18.8Z", "M19 6v12"],
  official: ["M4 11.2 14.5 6v12L4 13.8Z", "M14.5 9.2h3.2c1.4 0 2.3 1.1 2.3 2.6s-.9 2.7-2.3 2.7h-3.2", "M6.3 14.8 8 20h3l-1.4-6.4"],
  pause: ["M8.2 5.2v13.5M15.8 5v13.7"],
  play: ["M6.8 4.8 18.4 12 6.8 19.2Z"],
  satellite: ["M7.2 8.1 15.9 16.8M5.4 10l8.7 8.7", "M13.8 5.3 18.7 10.2 15.9 13l-4.9-4.9Z", "M4.1 16.8l3.1-3.1 3.1 3.1-3.1 3.1Z", "M16.8 4.1c1.6.5 2.7 1.6 3.2 3.2M17.8 1.8c2.3.7 3.8 2.2 4.4 4.5"],
  settings: ["M3.2 6.4h5.1M12.4 6.4h8.4", "M3.2 12h10.1M17.4 12h3.4", "M3.2 17.7h3.2M10.5 17.7h10.3", "M10.3 4.3c1.2 0 2.1.9 2.1 2.1s-.9 2.1-2.1 2.1-2.1-.9-2.1-2.1.9-2.1 2.1-2.1Z", "M15.4 9.9c1.2 0 2.1.9 2.1 2.1s-.9 2.1-2.1 2.1-2.1-.9-2.1-2.1.9-2.1 2.1-2.1Z", "M8.5 15.6c1.2 0 2.1.9 2.1 2.1s-.9 2.1-2.1 2.1-2.1-.9-2.1-2.1.9-2.1 2.1-2.1Z"],
  share: ["M12 14.8V3.5M12 3.5 8.3 7.2M12 3.5l3.7 3.7", "M8 9H6.5C5 9 4 10.1 4 11.6v5.9C4 19 5 20 6.5 20h11c1.5 0 2.5-1 2.5-2.5v-5.9C20 10.1 19 9 17.5 9H16"],
  sources: ["M5 5.5c0-1.3 3.1-2.4 7-2.4s7 1.1 7 2.4-3.1 2.4-7 2.4-7-1.1-7-2.4Z", "M5 5.5v5c0 1.3 3.1 2.4 7 2.4s7-1.1 7-2.4v-5", "M5 10.5v5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-5"],
  terrain: ["M2.8 18.8 8.2 10l3.2 4 3.3-7 6.5 11.8Z", "M5.5 18.8 9 14l2.2 2.7M13.6 9.3l1.2 2 1.4-1.1 2.4 4.4"],
  theme: ["M16.7 17.8A8.2 8.2 0 0 1 8.2 4.3 8.7 8.7 0 1 0 19.7 15a8.1 8.1 0 0 1-3 2.8Z"],
  watch: ["M12 21s6.2-6.4 6.2-11.2A6.2 6.2 0 0 0 5.8 9.8C5.8 14.6 12 21 12 21Z", "M12 6.7l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3Z"],
  wind: ["M3 8.2h10.7c2.8 0 3.2-4 .4-4.2-1.5-.1-2.4.8-2.6 1.8", "M3 12h15.3c3.2 0 3.4 4.5.2 4.7-1.7.1-2.6-.9-2.7-2", "M3 15.8h7.5"],
};

function SketchIcon({ name }: { name: SketchIconName }) {
  const paths = sketchIconPaths[name];
  return (
    <svg aria-hidden className="hand-drawn-tool-icon" viewBox="0 0 24 24">
      <g className="hand-drawn-tool-icon-echo">
        {paths.map((path) => <path d={path} key={`echo-${path}`} />)}
      </g>
      <g>
        {paths.map((path) => <path d={path} key={path} />)}
      </g>
    </svg>
  );
}

export function MapExperience() {
  const { data: authSession } = authClient.useSession();
  const { locale, t } = useLanguage();
  const [state, setState] = useState<LoadState>({ status: "loading", incidents: [] });
  const timeRange = 12;
  const [showWind, setShowWind] = useState(false);
  const [showForest, setShowForest] = useState(false);
  const [showAirQuality, setShowAirQuality] = useState(false);
  const [measureDistance, setMeasureDistance] = useState(false);
  const [measureArea, setMeasureArea] = useState(false);
  const [showMeasureHint, setShowMeasureHint] = useState(false);
  const [windState, setWindState] = useState<WindLoadState>({ status: "idle", observations: [] });
  const windLoadedRef = useRef(false);
  const effisPerimeters: EffisPerimeter[] = [];
  const [officialNotices, setOfficialNotices] = useState<OfficialNotice[]>([]);
  const [officialNoticesStatus, setOfficialNoticesStatus] = useState<"loading" | "ready" | "error">("loading");
  const [forestWeatherState, setForestWeatherState] = useState<ForestWeatherState>({ status: "idle" });
  const [showForestWeather, setShowForestWeather] = useState(false);
  const [baseMap, setBaseMap] = useState<BaseMap>("satellite");
  const [selectedLocation, setSelectedLocation] = useState<GeocodingSuggestion | null>(null);
  const [selectedLocationKind, setSelectedLocationKind] = useState<"search" | "geolocation" | "saved" | "pin">("search");
  const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(null);
  const [geolocationStatus, setGeolocationStatus] = useState<"idle" | "loading" | "denied" | "error">("idle");
  const [positionAccuracy, setPositionAccuracy] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [referenceTime, setReferenceTime] = useState(() => Date.now());
  const [refreshRevision, setRefreshRevision] = useState(0);
  const firmsRecoveryAttemptsRef = useRef(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, setMapLoadNotice] = useState<MapLoadNotice>({ kind: "hidden" });
  const [nextRefreshAt, setNextRefreshAt] = useState(() => Date.now() + 10 * 60_000);
  const [clock, setClock] = useState(() => Date.now());
  const [timelineOffsetHours, setTimelineOffsetHours] = useState(0);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [alertRadiusKm, setAlertRadiusKm] = useState(25);
  const alertLastCheckedAt = useRef(Date.now());
  const [notificationStatus, setNotificationStatus] = useState<"idle" | "granted" | "denied" | "unsupported">("idle");
  const [selectedLocationZoom, setSelectedLocationZoom] = useState<number | undefined>();
  const [mapView, setMapView] = useState<MapViewport>({
    east: 12,
    latitude: 46.6,
    longitude: 2.4,
    north: 53,
    south: 40,
    west: -7,
    zoom: 6,
  });
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");
  const [backgroundAlertStatus, setBackgroundAlertStatus] = useState<"idle" | "active" | "unsupported" | "error">("idle");
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>([]);
  const [communityVotes, setCommunityVotes] = useState<Record<string, -1 | 1>>({});
  const [reportModalLocation, setReportModalLocation] = useState<GeocodingSuggestion | null>(null);
  const [reportDraftLocation, setReportDraftLocation] = useState<GeocodingSuggestion | null>(null);
  const [reportObservedZone, setReportObservedZone] = useState<Array<{ latitude: number; longitude: number }> | null>(null);
  const [reportZoneDrawing, setReportZoneDrawing] = useState(false);
  const [reportDrawingType, setReportDrawingType] = useState<"area" | "line">("area");
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyStatus, setNearbyStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [nearbyError, setNearbyError] = useState("");
  const [showNearbyPlaces, setShowNearbyPlaces] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyYear, setHistoryYear] = useState(() => new Date().getUTCFullYear() - 1);
  const [historyPlaying, setHistoryPlaying] = useState(false);
  const [historyPlaces, setHistoryPlaces] = useState<BdiffHistoricalPlace[]>([]);
  const [historyStatus, setHistoryStatus] = useState<"idle" | "loading" | "ready" | "error" | "zoom">("idle");
  const [historyTotal, setHistoryTotal] = useState(0);
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const [mobileMoreSection, setMobileMoreSection] = useState<"root" | "layers" | "measure" | "sources" | "watch">("root");
  const [baseMapMenuOpen, setBaseMapMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [signalSummaryOpen, setSignalSummaryOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyCountryOverride, setEmergencyCountryOverride] = useState("");
  const [emergencyCallConfirmation, setEmergencyCallConfirmation] = useState(false);
  const [emergencyCopyStatus, setEmergencyCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [accountOpen, setAccountOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [informationOpen, setInformationOpen] = useState(false);
  const [darkMap, setDarkMap] = useState(false);
  const [mapPreferences, setMapPreferences] = useState<MapPreferences>(defaultMapPreferences);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [loadingScreenLeaving, setLoadingScreenLeaving] = useState(false);
  const [useSafariLoadingFallback, setUseSafariLoadingFallback] = useState(false);
  const loadingStartedAt = useRef(Date.now());
  const baseMapMenuRef = useRef<HTMLDivElement>(null);
  const baseMapButtonRef = useRef<HTMLButtonElement>(null);
  const moreToolsRef = useRef<HTMLDivElement>(null);
  const moreToolsButtonRef = useRef<HTMLButtonElement>(null);
  const reportModalPanelRef = useRef<HTMLDivElement>(null);
  const accountModalPanelRef = useRef<HTMLDivElement>(null);
  const informationModalPanelRef = useRef<HTMLDivElement>(null);
  const emergencyModalPanelRef = useRef<HTMLDivElement>(null);

  const closeMobileSheet = (panel: HTMLElement | null, onComplete: () => void) => {
    if (!panel || !window.matchMedia("(max-width: 720px)").matches) {
      onComplete();
      return;
    }
    gsap.killTweensOf(panel);
    gsap.to(panel, {
      duration: 0.3,
      ease: "power3.in",
      onComplete,
      yPercent: 105,
    });
  };

  const closeInformationPanel = () => {
    const panel = informationModalPanelRef.current;
    if (!panel) {
      setInformationOpen(false);
      return;
    }
    const mobile = window.matchMedia("(max-width: 720px)").matches;
    gsap.killTweensOf(panel);
    gsap.to(panel, {
      duration: mobile ? 0.3 : 0.22,
      ease: mobile ? "power3.in" : "power2.in",
      onComplete: () => setInformationOpen(false),
      scale: mobile ? 1 : 0.82,
      transformOrigin: mobile ? "50% 100%" : "100% 0%",
      yPercent: mobile ? 105 : 0,
    });
  };

  const closeReportModal = (afterClose?: () => void) => {
    const panel = reportModalPanelRef.current;
    if (!panel) {
      setReportModalLocation(null);
      afterClose?.();
      return;
    }
    gsap.killTweensOf(panel);
    const mobile = window.matchMedia("(max-width: 720px)").matches;
    gsap.to(panel, {
      duration: mobile ? 0.3 : 0.22,
      ease: mobile ? "power3.in" : "power2.in",
      onComplete: () => {
        setReportModalLocation(null);
        afterClose?.();
      },
      scale: mobile ? 1 : 0.72,
      transformOrigin: mobile ? "50% 100%" : "50% 50%",
      yPercent: mobile ? 105 : 0,
    });
  };

  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem(MAP_THEME_KEY);
      setDarkMap(storedTheme === "dark");
      const storedPreferences = JSON.parse(window.localStorage.getItem(MAP_PREFERENCES_KEY) ?? "{}") as Partial<MapPreferences>;
      const preferences = { ...defaultMapPreferences, ...storedPreferences };
      setMapPreferences(preferences);
      setAlertRadiusKm(preferences.alertRadiusKm);
    } catch {
      setDarkMap(false);
      setMapPreferences(defaultMapPreferences);
    } finally {
      setPreferencesReady(true);
    }
  }, []);

  useEffect(() => {
    if (!measureDistance && !measureArea) {
      setShowMeasureHint(false);
      return;
    }
    setShowMeasureHint(true);
    const timer = window.setTimeout(() => setShowMeasureHint(false), 4_500);
    return () => window.clearTimeout(timer);
  }, [measureArea, measureDistance]);

  useEffect(() => {
    const panel = reportModalPanelRef.current;
    if (!reportModalLocation || !panel) return;
    gsap.killTweensOf(panel);
    const mobile = window.matchMedia("(max-width: 720px)").matches;
    gsap.fromTo(
      panel,
      mobile
        ? { scale: 1, transformOrigin: "50% 100%", yPercent: 105 }
        : { scale: 0.72, transformOrigin: "50% 50%", yPercent: 0 },
      mobile
        ? { duration: 0.38, ease: "power3.out", scale: 1, yPercent: 0 }
        : { duration: 0.32, ease: "back.out(1.3)", scale: 1, yPercent: 0 },
    );
    return () => {
      gsap.killTweensOf(panel);
    };
  }, [reportModalLocation]);

  useEffect(() => {
    const panel = accountModalPanelRef.current;
    if (!accountOpen || !panel || !window.matchMedia("(max-width: 720px)").matches) return;
    gsap.killTweensOf(panel);
    gsap.fromTo(
      panel,
      { transformOrigin: "50% 100%", yPercent: 105 },
      { duration: 0.38, ease: "power3.out", yPercent: 0 },
    );
    return () => {
      gsap.killTweensOf(panel);
    };
  }, [accountOpen]);

  useEffect(() => {
    const panel = informationModalPanelRef.current;
    if (!informationOpen || !panel) return;
    const mobile = window.matchMedia("(max-width: 720px)").matches;
    gsap.killTweensOf(panel);
    if (mobile) {
      gsap.fromTo(
        panel,
        { scale: 1, transformOrigin: "50% 100%", yPercent: 105 },
        { duration: 0.38, ease: "power3.out", scale: 1, yPercent: 0 },
      );
    } else {
      const panelRect = panel.getBoundingClientRect();
      const trigger = Array.from(document.querySelectorAll<HTMLElement>("[data-information-trigger]"))
        .find((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const triggerRect = trigger?.getBoundingClientRect();
      const transformOrigin = triggerRect
        ? `${triggerRect.left + triggerRect.width / 2 - panelRect.left}px ${triggerRect.top + triggerRect.height / 2 - panelRect.top}px`
        : "100% 0%";
      gsap.fromTo(
        panel,
        { scale: 0.82, transformOrigin, yPercent: 0 },
        { duration: 0.34, ease: "back.out(1.25)", scale: 1, yPercent: 0 },
      );
    }
    return () => {
      gsap.killTweensOf(panel);
    };
  }, [informationOpen]);

  useEffect(() => {
    const panel = emergencyModalPanelRef.current;
    if (!emergencyOpen || !panel) return;
    const mobile = window.matchMedia("(max-width: 720px)").matches;
    gsap.killTweensOf(panel);
    gsap.fromTo(
      panel,
      mobile
        ? { transformOrigin: "50% 100%", yPercent: 105 }
        : { scale: 0.82, transformOrigin: "50% 50%", yPercent: 0 },
      mobile
        ? { duration: 0.38, ease: "power3.out", yPercent: 0 }
        : { duration: 0.32, ease: "back.out(1.25)", scale: 1 },
    );
    return () => {
      gsap.killTweensOf(panel);
    };
  }, [emergencyOpen]);

  useEffect(() => {
    const panel = baseMapMenuRef.current;
    if (!panel) return;
    gsap.killTweensOf(panel);
    if (baseMapMenuOpen) {
      gsap.set(panel, { visibility: "visible" });
      const panelRect = panel.getBoundingClientRect();
      const buttonRect = baseMapButtonRef.current?.getBoundingClientRect();
      const transformOrigin = buttonRect
        ? `${buttonRect.left + buttonRect.width / 2 - panelRect.left}px ${buttonRect.top + buttonRect.height / 2 - panelRect.top}px`
        : "100% 100%";
      gsap.set(panel, { scale: 0.72, transformOrigin });
      gsap.to(panel, { duration: 0.32, ease: "back.out(1.35)", scale: 1 });
    } else {
      gsap.to(panel, {
        duration: 0.22,
        ease: "power2.in",
        scale: 0.72,
        onComplete: () => gsap.set(panel, { visibility: "hidden" }),
      });
    }
  }, [baseMapMenuOpen]);

  useEffect(() => {
    const panel = moreToolsRef.current;
    if (!panel) return;
    gsap.killTweensOf(panel);
    if (moreToolsOpen) {
      gsap.set(panel, { visibility: "visible" });
      const panelRect = panel.getBoundingClientRect();
      const buttonRect = moreToolsButtonRef.current?.getBoundingClientRect();
      const transformOrigin = buttonRect
        ? `${buttonRect.left + buttonRect.width / 2 - panelRect.left}px ${buttonRect.top + buttonRect.height / 2 - panelRect.top}px`
        : "100% 100%";
      gsap.set(panel, { scale: 0.72, transformOrigin });
      gsap.to(panel, { duration: 0.34, ease: "back.out(1.3)", scale: 1 });
    } else {
      gsap.to(panel, {
        duration: 0.23,
        ease: "power2.in",
        scale: 0.72,
        onComplete: () => gsap.set(panel, { visibility: "hidden" }),
      });
    }
  }, [moreToolsOpen]);

  useEffect(() => {
    if (state.status === "loading" || !preferencesReady) return;
    const minimumDisplayTime = 2_300;
    const remainingTime = Math.max(0, minimumDisplayTime - (Date.now() - loadingStartedAt.current));
    const timeout = window.setTimeout(() => setLoadingScreenLeaving(true), remainingTime);
    return () => window.clearTimeout(timeout);
  }, [preferencesReady, state.status]);

  useEffect(() => {
    const maximumLoadingTime = window.setTimeout(() => {
      setLoadingScreenLeaving(true);
    }, 4_500);
    return () => window.clearTimeout(maximumLoadingTime);
  }, []);

  useEffect(() => {
    const isSafari = /Version\/[\d.]+.*Safari\//i.test(navigator.userAgent)
      && !/(CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium|Android)/i.test(navigator.userAgent);
    setUseSafariLoadingFallback(isSafari);
  }, []);

  useEffect(() => {
    if (!loadingScreenLeaving) return;
    const timeout = window.setTimeout(() => setShowLoadingScreen(false), 680);
    return () => window.clearTimeout(timeout);
  }, [loadingScreenLeaving]);

  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem(MAP_PREFERENCES_KEY, JSON.stringify(mapPreferences));
    setAlertRadiusKm(mapPreferences.alertRadiusKm);
  }, [mapPreferences, preferencesReady]);

  useEffect(() => {
    if (!informationOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeInformationPanel();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [informationOpen]);

  useEffect(() => {
    const clockTimer = window.setInterval(() => {
      setClock(Date.now());
      setReferenceTime(Date.now());
    }, 60_000);
    const refreshTimer = window.setInterval(() => setRefreshRevision((revision) => revision + 1), 10 * 60_000);
    return () => {
      window.clearInterval(clockTimer);
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    const localReports = parseCommunityReports(window.localStorage.getItem(COMMUNITY_REPORTS_KEY))
      .map((report) => {
        const isLegacyLocalReport = !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(report.id)
          || Boolean(report.mediaUrl?.startsWith("indexeddb:"));
        return isLegacyLocalReport
          ? { ...report, ownedByViewer: true, storedLocally: true }
          : report;
      });
    fetch("/api/community/reports", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error("Signalements indisponibles");
        const remoteReports = Array.isArray(payload.reports) ? payload.reports as CommunityReport[] : [];
        if (payload.viewerVotes && typeof payload.viewerVotes === "object") setCommunityVotes(payload.viewerVotes);
        const remoteIds = new Set(remoteReports.map((report) => report.id));
        setCommunityReports([...remoteReports, ...localReports.filter((report) => !remoteIds.has(report.id))]);
      })
      .catch(() => setCommunityReports(localReports));
    try {
      const storedVotes = JSON.parse(window.localStorage.getItem(COMMUNITY_VOTES_KEY) ?? "{}");
      if (storedVotes && typeof storedVotes === "object") setCommunityVotes(storedVotes);
    } catch {
      setCommunityVotes({});
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/official/notices", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Flux officiel indisponible");
        const payload = await response.json() as { notices?: OfficialNotice[] };
        setOfficialNotices(payload.notices ?? []);
        setOfficialNoticesStatus("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setOfficialNoticesStatus("error");
      });
    return () => controller.abort();
  }, [refreshRevision]);

  const voteCommunityReport = async (reportId: string, vote: -1 | 1) => {
    if (!authSession?.user) {
      setAccountOpen(true);
      return;
    }
    const previousVote: -1 | 0 | 1 = Object.prototype.hasOwnProperty.call(communityVotes, reportId)
      ? communityVotes[reportId]
      : 0;
    const nextReports = communityReports.map((report) =>
      report.id === reportId ? applyCommunityVote(report, previousVote, vote) : report);
    const nextVotes = { ...communityVotes, [reportId]: vote };
    setCommunityReports(nextReports);
    setCommunityVotes(nextVotes);
    window.localStorage.setItem(COMMUNITY_REPORTS_KEY, JSON.stringify(nextReports));
    window.localStorage.setItem(COMMUNITY_VOTES_KEY, JSON.stringify(nextVotes));
    try {
      const response = await fetch(`/api/community/reports/${encodeURIComponent(reportId)}/vote`, {
        body: JSON.stringify({ value: vote }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);
      setCommunityReports((reports) => reports.map((report) =>
        report.id === reportId ? { ...report, confirms: payload.confirms, disputes: payload.disputes } : report));
    } catch {
      setCommunityReports(communityReports);
      setCommunityVotes((votes) => {
        const restored = { ...votes };
        if (previousVote === 0) delete restored[reportId];
        else restored[reportId] = previousVote;
        return restored;
      });
    }
  };

  const deleteCommunityReport = async (reportId: string) => {
    if (!window.confirm(t("mapExperience.permanentlyDeleteThisReport"))) return;
    const report = communityReports.find((item) => item.id === reportId);
    if (report?.storedLocally) {
      const nextReports = communityReports.filter((item) => item.id !== reportId);
      setCommunityReports(nextReports);
      window.localStorage.setItem(
        COMMUNITY_REPORTS_KEY,
        JSON.stringify(nextReports.filter((item) => item.storedLocally)),
      );
      return;
    }
    const response = await fetch(`/api/community/reports/${encodeURIComponent(reportId)}`, { method: "DELETE" });
    if (!response.ok) return;
    setCommunityReports((reports) => reports.filter((report) => report.id !== reportId));
    setCommunityVotes((votes) => {
      const next = { ...votes };
      delete next[reportId];
      return next;
    });
  };

  const playbackDelay = mapPreferences.playbackSpeed === "slow"
    ? 1_400
    : mapPreferences.playbackSpeed === "fast" ? 450 : 900;
  const timelineMaxHours = mapPreferences.timelineRangeDays * 24;

  useEffect(() => {
    setTimelineOffsetHours((hours) => Math.min(hours, timelineMaxHours));
  }, [timelineMaxHours]);

  useEffect(() => {
    if (!timelinePlaying) return;
    if (timelineOffsetHours <= 0) {
      setTimelinePlaying(false);
      return;
    }
    const timer = window.setTimeout(
      () => setTimelineOffsetHours((hours) => Math.max(0, hours - 1)),
      playbackDelay,
    );
    return () => window.clearTimeout(timer);
  }, [playbackDelay, timelineOffsetHours, timelinePlaying]);

  useEffect(() => {
    if (!historyPlaying) return;
    const lastYear = new Date().getUTCFullYear() - 1;
    if (historyYear >= lastYear) {
      setHistoryPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setHistoryYear((year) => year + 1), playbackDelay);
    return () => window.clearTimeout(timer);
  }, [historyPlaying, historyYear, playbackDelay]);

  useEffect(() => {
    if (!showHistory) return;
    if (mapView.zoom < 8) {
      setHistoryStatus("zoom");
      setHistoryPlaces([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setHistoryStatus("loading");
      const parameters = new URLSearchParams({
        lat: String(mapView.latitude),
        lon: String(mapView.longitude),
        year: String(historyYear),
        zoom: String(mapView.zoom),
      });
      try {
        const response = await fetch(`/api/history/bdiff?${parameters}`, { signal: controller.signal });
        const payload = await response.json() as {
          message?: string;
          places?: BdiffHistoricalPlace[];
          total?: number;
        };
        if (!response.ok) throw new Error(payload.message || "Historique indisponible");
        setHistoryPlaces(payload.places ?? []);
        setHistoryTotal(payload.total ?? 0);
        setHistoryStatus("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHistoryStatus("error");
        setHistoryPlaces([]);
      }
    }, 450);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [historyYear, mapView, showHistory]);

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(window.navigator.onLine);
    const initializeBrowserState = window.setTimeout(() => {
      setSavedLocation(parseSavedLocation(window.localStorage.getItem(SAVED_LOCATION_KEY)));
      setAlertEnabled(window.localStorage.getItem(ALERT_ENABLED_KEY) === "true");
      const storedRadius = Number(window.localStorage.getItem(ALERT_RADIUS_KEY));
      if ([5, 10, 25, 50].includes(storedRadius)) setAlertRadiusKm(storedRadius);
      const storedCheckedAt = Number(window.localStorage.getItem(ALERT_CHECKED_AT_KEY));
      if (Number.isFinite(storedCheckedAt) && storedCheckedAt > 0) alertLastCheckedAt.current = storedCheckedAt;
      setNotificationStatus(!("Notification" in window)
        ? "unsupported"
        : Notification.permission === "granted"
          ? "granted"
          : Notification.permission === "denied" ? "denied" : "idle");
      const shared = new URLSearchParams(window.location.search);
      const sharedLatitudeParameter = shared.get("lat");
      const sharedLongitudeParameter = shared.get("lon");
      const sharedLatitude = Number(sharedLatitudeParameter);
      const sharedLongitude = Number(sharedLongitudeParameter);
      const sharedZoom = Number(shared.get("zoom"));
      if (
        sharedLatitudeParameter !== null && sharedLatitudeParameter.trim() !== ""
        && sharedLongitudeParameter !== null && sharedLongitudeParameter.trim() !== ""
        && Number.isFinite(sharedLatitude) && sharedLatitude >= -90 && sharedLatitude <= 90
        && Number.isFinite(sharedLongitude) && sharedLongitude >= -180 && sharedLongitude <= 180
      ) {
        setSelectedLocation({
          id: shared.get("zone") || "shared-view",
          label: t("mapExperience.sharedView"),
          latitude: sharedLatitude,
          longitude: sharedLongitude,
          kind: "pin",
        });
        setSelectedLocationKind("pin");
        setSelectedLocationZoom(Number.isFinite(sharedZoom) ? Math.min(18, Math.max(5, sharedZoom)) : 12);
      }
      updateOnlineState();
    }, 0);
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.clearTimeout(initializeBrowserState);
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    if (!alertEnabled || !savedLocation || state.status !== "ready") return;
    const newNearbyIncidents = state.incidents.filter((incident) =>
      new Date(incident.observedAt).getTime() > alertLastCheckedAt.current
      && distanceKm(savedLocation, incident) <= alertRadiusKm);
    const checkedAt = Date.now();
    alertLastCheckedAt.current = checkedAt;
    window.localStorage.setItem(ALERT_CHECKED_AT_KEY, String(checkedAt));
    if (newNearbyIncidents.length && "Notification" in window && Notification.permission === "granted") {
      const nearest = newNearbyIncidents.reduce((closest, incident) =>
        distanceKm(savedLocation, incident) < distanceKm(savedLocation, closest) ? incident : closest);
      new Notification("Nouvelle activité thermique à proximité", {
        body: `${newNearbyIncidents.length} ${newNearbyIncidents.length === 1 ? "nouveau signal" : "nouveaux signaux"} dans un rayon de ${alertRadiusKm} km autour de ${savedLocation.label}. Le plus proche est à ${formatDistance(distanceKm(savedLocation, nearest))}.`,
        icon: "/icon.svg",
      });
    }
  }, [alertEnabled, alertRadiusKm, savedLocation, state]);

  useEffect(() => {
    const controller = new AbortController();
    let recoveryTimeout: number | undefined;
    let loadTimeout: number | undefined;
    let noticeTimeout: number | undefined;
    let slowNoticeTimeout: number | undefined;
    setIsRefreshing(true);
    setMapLoadNotice({ kind: "searching" });
    slowNoticeTimeout = window.setTimeout(() => setMapLoadNotice({ kind: "slow" }), 4_000);
    async function loadIncidents() {
      try {
        const requestedDays = Math.min(8, mapPreferences.timelineRangeDays + 1);
        const firmsArea = {
          east: Math.min(180, Math.ceil(mapView.east)),
          north: Math.min(90, Math.ceil(mapView.north)),
          south: Math.max(-90, Math.floor(mapView.south)),
          west: Math.max(-180, Math.floor(mapView.west)),
        };
        const parameters = new URLSearchParams({
          days: String(requestedDays),
          east: String(firmsArea.east),
          north: String(firmsArea.north),
          south: String(firmsArea.south),
          west: String(firmsArea.west),
          zoom: mapView.zoom.toFixed(2),
        });
        const response = await fetch(`/api/incidents/firms?${parameters}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json() as {
          failedSources: string[];
          fetchedAt: string;
          incidents: Incident[];
          message?: string;
          zoomRequired?: boolean;
        };
        if (!response.ok) throw new Error(payload.message || t("mapExperience.theSatelliteSourceIsUnavailable"));
        if (slowNoticeTimeout !== undefined) window.clearTimeout(slowNoticeTimeout);
        const refreshedAt = Date.now();
        setState({
          status: "ready",
          incidents: payload.incidents,
          fetchedAt: payload.fetchedAt,
          partial: payload.failedSources.length > 0,
        });
        firmsRecoveryAttemptsRef.current = 0;
        setReferenceTime(refreshedAt);
        setNextRefreshAt(refreshedAt + 10 * 60_000);
        setMapLoadNotice(payload.zoomRequired
          ? { kind: "zoom" }
          : payload.incidents.length > 0
            ? { kind: "success", count: payload.incidents.length }
            : { kind: "empty" });
        noticeTimeout = window.setTimeout(
          () => setMapLoadNotice({ kind: "hidden" }),
          payload.zoomRequired ? 4_500 : 3_200,
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        if (slowNoticeTimeout !== undefined) window.clearTimeout(slowNoticeTimeout);
        setMapLoadNotice({ kind: "error" });
        setState((current) => current.incidents.length
          ? current
          : { status: "error", incidents: [], message: error instanceof Error ? error.message : "La source satellite est indisponible." });
        if (firmsRecoveryAttemptsRef.current < 3) {
          const recoveryDelays = [2_500, 7_500, 15_000];
          const delay = recoveryDelays[firmsRecoveryAttemptsRef.current];
          firmsRecoveryAttemptsRef.current += 1;
          recoveryTimeout = window.setTimeout(() => {
            if (navigator.onLine && document.visibilityState === "visible") {
              setRefreshRevision((revision) => revision + 1);
            }
          }, delay);
        }
      } finally {
        if (!controller.signal.aborted) setIsRefreshing(false);
      }
    }
    loadTimeout = window.setTimeout(() => void loadIncidents(), 650);
    return () => {
      controller.abort();
      if (loadTimeout !== undefined) window.clearTimeout(loadTimeout);
      if (noticeTimeout !== undefined) window.clearTimeout(noticeTimeout);
      if (recoveryTimeout !== undefined) window.clearTimeout(recoveryTimeout);
      if (slowNoticeTimeout !== undefined) window.clearTimeout(slowNoticeTimeout);
    };
  }, [mapPreferences.timelineRangeDays, mapView.east, mapView.north, mapView.south, mapView.west, mapView.zoom, refreshRevision, t]);

  useEffect(() => {
    if (state.status !== "error") return;
    const retryWhenActive = () => {
      if (!navigator.onLine || document.visibilityState !== "visible") return;
      firmsRecoveryAttemptsRef.current = 0;
      setRefreshRevision((revision) => revision + 1);
    };
    window.addEventListener("online", retryWhenActive);
    window.addEventListener("pageshow", retryWhenActive);
    document.addEventListener("visibilitychange", retryWhenActive);
    return () => {
      window.removeEventListener("online", retryWhenActive);
      window.removeEventListener("pageshow", retryWhenActive);
      document.removeEventListener("visibilitychange", retryWhenActive);
    };
  }, [state.status]);

  useEffect(() => {
    if (!showWind || windLoadedRef.current) return;
    const controller = new AbortController();
    async function loadWind() {
      setWindState({ status: "loading", observations: [] });
      try {
        const response = await fetch("/api/weather/wind", { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || t("mapExperience.windDataIsUnavailable"));
        windLoadedRef.current = true;
        setWindState({ status: "ready", observations: payload.observations, fetchedAt: payload.fetchedAt });
      } catch (error) {
        if (controller.signal.aborted) return;
        setWindState({
          status: "error",
          observations: [],
          message: error instanceof Error ? error.message : t("mapExperience.windDataIsUnavailable"),
        });
      }
    }
    loadWind();
    return () => controller.abort();
  }, [showWind]);

  const deduplicatedIncidents = useMemo(() => deduplicateSatelliteIncidents(state.incidents), [state.incidents]);
  const visibleIncidents = useMemo(() => {
    const upperBound = referenceTime - timelineOffsetHours * 3_600_000;
    const cutoff = upperBound - timeRange * 3_600_000;
    return deduplicatedIncidents.filter((incident) => {
      const observedAt = new Date(incident.observedAt).getTime();
      return observedAt >= cutoff && observedAt <= upperBound;
    });
  }, [deduplicatedIncidents, referenceTime, timeRange, timelineOffsetHours]);
  const displayedReferenceTime = referenceTime - timelineOffsetHours * 3_600_000;
  const priorityZones = useMemo(() => clusterDenseIncidents(visibleIncidents, 2.5, 3)
    .map((cluster) => {
      const summary = summarizeFireActivity(cluster.incidents, displayedReferenceTime);
      const distance = selectedLocation ? distanceKm(selectedLocation, cluster) : null;
      const score = (summary.trend === "rising" ? 100 : summary.trend === "stable" ? 40 : 0)
        + (summary.confidence === "high" ? 40 : summary.confidence === "medium" ? 20 : 0)
        + Math.min(50, summary.radiativePowerMw === null ? 0 : Math.log10(Math.max(1, summary.radiativePowerMw)) * 15)
        - (distance === null ? 0 : Math.min(30, distance / 10));
      return { ...cluster, distance, score, summary };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5), [displayedReferenceTime, selectedLocation, visibleIncidents]);
  const closestIncident = useMemo(() => {
    if (!selectedLocation || visibleIncidents.length === 0) return null;
    return visibleIncidents.reduce<{ incident: Incident; distance: number } | null>((closest, incident) => {
      const distance = distanceKm(selectedLocation, incident);
      return !closest || distance < closest.distance ? { incident, distance } : closest;
    }, null);
  }, [selectedLocation, visibleIncidents]);
  const latestIncident = useMemo(
    () => visibleIncidents.reduce<Incident | null>(
      (latest, incident) => !latest || incident.observedAt > latest.observedAt ? incident : latest,
      null,
    ),
    [visibleIncidents],
  );
  const providerLatestIncident = useMemo(
    () => deduplicatedIncidents.reduce<Incident | null>(
      (latest, incident) => !latest || incident.observedAt > latest.observedAt ? incident : latest,
      null,
    ),
    [deduplicatedIncidents],
  );
  const dataQuality = state.status === "loading"
    ? { className: "quality-loading", label: t("mapExperience.synchronising") }
    : state.status === "error"
      ? { className: "quality-error", label: t("mapExperience.sourceUnavailable") }
      : state.partial
        ? { className: "quality-partial", label: t("mapExperience.partialResult") }
        : providerLatestIncident && referenceTime - new Date(providerLatestIncident.observedAt).getTime() <= 3 * 3_600_000
          ? { className: "quality-fresh", label: t("mapExperience.recentData") }
          : { className: "quality-stale", label: t("mapExperience.olderData") };
  const satelliteUpdateLabel = state.status === "ready"
    ? t("mapExperience.updatedAgo", { age: formatAge(state.fetchedAt, new Date(clock), locale === "fr-FR" ? "fr" : "en") })
    : dataQuality.label;
  const emergencyLocation = selectedLocation ?? mapView;
  const detectedEmergencyCountryCode = useMemo(
    () => iso1A2Code([emergencyLocation.longitude, emergencyLocation.latitude]),
    [emergencyLocation.latitude, emergencyLocation.longitude],
  );
  const emergencyCountryCode = emergencyCountryOverride || detectedEmergencyCountryCode || "";
  const emergencyNumber = emergencyNumberForCountry(emergencyCountryCode);
  const emergencyCountryNames = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return [...EU_COUNTRY_CODES, "US"]
      .map((code) => ({ code, label: names.of(code) ?? code }))
      .sort((left, right) => left.label.localeCompare(right.label, locale));
  }, [locale]);
  const detectedEmergencyCountryName = useMemo(() => {
    if (!detectedEmergencyCountryCode) return null;
    return new Intl.DisplayNames([locale], { type: "region" }).of(detectedEmergencyCountryCode) ?? detectedEmergencyCountryCode;
  }, [detectedEmergencyCountryCode, locale]);
  const openEmergencyPanel = () => {
    setEmergencyCountryOverride(emergencyNumberForCountry(detectedEmergencyCountryCode) ? detectedEmergencyCountryCode ?? "" : "");
    setEmergencyCallConfirmation(false);
    setEmergencyCopyStatus("idle");
    setEmergencyOpen(true);
  };
  const closeEmergencyPanel = () => {
    const panel = emergencyModalPanelRef.current;
    if (!panel) {
      setEmergencyOpen(false);
      return;
    }
    const mobile = window.matchMedia("(max-width: 720px)").matches;
    gsap.killTweensOf(panel);
    gsap.to(panel, {
      duration: mobile ? 0.3 : 0.2,
      ease: mobile ? "power3.in" : "power2.in",
      onComplete: () => setEmergencyOpen(false),
      scale: mobile ? 1 : 0.84,
      yPercent: mobile ? 105 : 0,
    });
  };
  const copyEmergencyCoordinates = async () => {
    const coordinates = `${emergencyLocation.latitude.toFixed(6)}, ${emergencyLocation.longitude.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(coordinates);
      setEmergencyCopyStatus("copied");
    } catch {
      setEmergencyCopyStatus("error");
    }
  };
  const locateUser = () => {
    if (!navigator.geolocation) {
      setGeolocationStatus("error");
      return;
    }
    setGeolocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSelectedLocation({
          id: "current-position",
          label: "Ma position approximative",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          kind: "geolocation",
        });
        setSelectedLocationKind("geolocation");
        setPositionAccuracy(position.coords.accuracy);
        setGeolocationStatus("idle");
      },
      (error) => {
        setGeolocationStatus(error.code === error.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
    );
  };

  const saveSelectedLocation = () => {
    if (!selectedLocation) return;
    const location: SavedLocation = {
      label: selectedLocation.label,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      address: selectedLocationKind === "search" ? selectedLocation.label : undefined,
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem(SAVED_LOCATION_KEY, JSON.stringify(location));
    setSavedLocation(location);
    if (alertEnabled) void syncBackgroundAlert(true, location, alertRadiusKm);
  };

  const removeSavedLocation = () => {
    window.localStorage.removeItem(SAVED_LOCATION_KEY);
    setSavedLocation(null);
    setAlertEnabled(false);
    window.localStorage.setItem(ALERT_ENABLED_KEY, "false");
    void syncBackgroundAlert(false, null, alertRadiusKm);
  };

  const syncBackgroundAlert = async (
    enabled: boolean,
    location: SavedLocation | null,
    radiusKm: number,
  ) => {
    if (!("serviceWorker" in navigator)) {
      setBackgroundAlertStatus("unsupported");
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: "sentinel-alert-config",
        config: {
          enabled,
          latitude: location?.latitude,
          longitude: location?.longitude,
          label: location?.label,
          radiusKm,
          checkedAt: Date.now(),
        },
      });
      const periodicSync = (registration as ServiceWorkerRegistration & {
        periodicSync?: { register: (tag: string, options: { minInterval: number }) => Promise<void> };
      }).periodicSync;
      if (enabled && periodicSync) {
        await periodicSync.register("sentinel-check-fire-alerts", { minInterval: 15 * 60_000 });
        setBackgroundAlertStatus("active");
      } else {
        setBackgroundAlertStatus(enabled ? "unsupported" : "idle");
      }
    } catch {
      setBackgroundAlertStatus("error");
    }
  };

  const toggleAlerts = async (enabled: boolean) => {
    if (!savedLocation) return;
    if (enabled && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission === "granted" ? "granted" : "denied");
      if (permission !== "granted") return;
    } else if (enabled) {
      setNotificationStatus("unsupported");
    }
    const checkedAt = Date.now();
    setAlertEnabled(enabled);
    alertLastCheckedAt.current = checkedAt;
    window.localStorage.setItem(ALERT_ENABLED_KEY, String(enabled));
    window.localStorage.setItem(ALERT_CHECKED_AT_KEY, String(checkedAt));
    await syncBackgroundAlert(enabled, savedLocation, alertRadiusKm);
  };

  const shareCurrentView = async () => {
    const parameters = new URLSearchParams({
      lat: mapView.latitude.toFixed(5),
      lon: mapView.longitude.toFixed(5),
      zoom: String(mapView.zoom),
    });
    if (selectedLocation?.id.startsWith("zone-")) parameters.set("zone", selectedLocation.id);
    const url = `${window.location.origin}${window.location.pathname}?${parameters}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
      window.setTimeout(() => setShareStatus("idle"), 2_000);
    } catch {
      setShareStatus("error");
    }
  };

  const loadNearbyPlaces = async () => {
    const point = selectedLocation ?? mapView;
    const parameters = new URLSearchParams({ lat: String(point.latitude), lon: String(point.longitude) });
    setNearbyStatus("loading");
    setNearbyError("");
    try {
      const response = await fetch(`/api/context/nearby?${parameters}`);
      const body = await response.text();
      let payload: { message?: string; places?: NearbyPlace[] };
      try {
        payload = JSON.parse(body) as { message?: string; places?: NearbyPlace[] };
      } catch {
        throw new Error(t("mapExperience.unreadableServerResponse", { status: response.status }));
      }
      if (!response.ok) throw new Error(payload.message || `Erreur serveur ${response.status}`);
      if (!Array.isArray(payload.places)) throw new Error(t("mapExperience.theResponseDoesNotContainAListOf"));
      setNearbyPlaces(payload.places);
      setNearbyStatus("ready");
    } catch (error) {
      setNearbyError(error instanceof Error ? error.message : "Erreur inconnue");
      setNearbyStatus("error");
    }
  };

  const loadForestWeather = async () => {
    setForestWeatherState({ status: "loading" });
    try {
      const response = await fetch("/api/fire-danger/forest-weather");
      const payload = await response.json() as {
        departments?: ForestWeatherDepartment[];
        publishedAt?: string;
        zones?: ForestWeatherZones;
      };
      if (
        !response.ok || !Array.isArray(payload.departments) || !payload.publishedAt
        || payload.zones?.type !== "FeatureCollection"
      ) {
        throw new Error("Données indisponibles");
      }
      setForestWeatherState({
        status: "ready",
        departments: payload.departments,
        publishedAt: payload.publishedAt,
        zones: payload.zones,
      });
    } catch {
      setForestWeatherState({ status: "error" });
    }
  };

  const activeLayerCount = [
    showWind,
    showAirQuality,
    showForestWeather,
    showNearbyPlaces,
    showForest,
    showHistory,
  ].filter(Boolean).length;
  const activeMeasureCount = [measureDistance, measureArea].filter(Boolean).length;
  const activeWatchCount = alertEnabled ? 1 : 0;
  const activeSecondaryToolCount = activeLayerCount + activeMeasureCount + activeWatchCount;
  const preferenceClasses = [
    mapPreferences.fontStyle === "hand" ? "map-font-hand" : "",
    `map-markers-${mapPreferences.markerSize}`,
    `map-halos-${mapPreferences.haloIntensity}`,
    mapPreferences.showTooltips ? "" : "map-tooltips-hidden",
    mapPreferences.reduceMotion ? "map-reduce-motion" : "",
    mapPreferences.textSize === "large" ? "map-text-large" : "",
    mapPreferences.highContrast ? "map-high-contrast" : "",
  ].filter(Boolean).join(" ");
  const timelineControlClass = "flex h-10 w-10 min-w-10 flex-[0_0_40px] rotate-[-.8deg] cursor-pointer items-center justify-center rounded-[51%_49%_47%_53%] border-[1.7px] border-[#172322] bg-white/95 p-0 text-[1.05rem] font-black text-[#263532] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fire max-[520px]:h-9 max-[520px]:w-9 max-[520px]:min-w-9 max-[520px]:basis-9";
  const mobileSecondaryButtonClass = "relative flex h-11 w-full transform-none items-center justify-start gap-2.5 rounded-[10px_7px_12px_8px] border-[1.5px] border-[#263532] bg-transparent px-3 text-left text-[.78rem] leading-tight font-extrabold text-[#172322] shadow-[2px_2px_0_rgba(23,35,34,.1)] [&_.hand-drawn-tool-icon]:text-[#172322] [&_svg]:shrink-0 [&>span]:min-w-0 [&>span]:whitespace-nowrap";
  const mobileSecondaryActiveClass = "border-[#d9482f] bg-[repeating-linear-gradient(35deg,rgba(217,72,47,.04)_0_5px,rgba(217,72,47,.22)_5px_6px,transparent_6px_10px)] text-[#9c2f21]";

  return (
    <section className={`map-page relative h-dvh min-h-[520px] ${preferenceClasses} ${darkMap ? "dark dark-map bg-[#050706]" : ""}`} aria-label={t("mapExperience.eventMap")}>
      {showLoadingScreen && (
        <div
          aria-label={t("mapExperience.loadingTheMap")}
          aria-live="polite"
          className={`loading-screen-failsafe fixed inset-0 z-[5000] grid place-items-center bg-white ${loadingScreenLeaving ? "loading-screen-leaving" : ""}`}
          role="status"
        >
          <div className="grid place-items-center gap-5">
            <div className="relative size-[clamp(170px,34vw,280px)]" aria-label={t("mapExperience.animatedFiremapsLogo")}>
              {useSafariLoadingFallback ? (
                <Image
                  alt="Logo Firemaps"
                  className="loading-logo-fallback object-contain"
                  fill
                  priority
                  sizes="(max-width: 520px) 170px, 280px"
                  src="/logo.png"
                />
              ) : (
                <video
                  aria-label={t("mapExperience.animatedFiremapsLogo")}
                  autoPlay
                  className="absolute inset-0 size-full object-contain"
                  loop
                  muted
                  playsInline
                  poster="/logo.png"
                  preload="auto"
                  src="/logo.mp4"
                />
              )}
            </div>
            <span aria-hidden className="relative h-5 min-w-[280px] whitespace-nowrap text-center text-sm font-black tracking-[.14em] text-[#172322] uppercase">
              <span className="loading-message loading-message-first">{t("mapExperience.loadingTheMap2")}</span>
              <span className="loading-message loading-message-second">{t("mapExperience.letSProtectOurForests")}</span>
            </span>
          </div>
        </div>
      )}
      <IncidentMap
        areaUnit={mapPreferences.areaUnit}
        baseMap={baseMap}
        communityReports={communityReports}
        communityVotes={communityVotes}
        coordinateFormat={mapPreferences.coordinateFormat}
        darkMap={darkMap}
        distanceUnit={mapPreferences.distanceUnit}
        effisPerimeters={effisPerimeters}
        incidents={showHistory ? [] : visibleIncidents}
        historyPlaces={historyPlaces}
        forestWeatherZones={forestWeatherState.status === "ready" ? forestWeatherState.zones : null}
        nearbyPlaces={nearbyPlaces}
        officialNotices={officialNotices}
        onClearSelection={() => {
          setSelectedLocation(null);
          setSelectedLocationZoom(undefined);
          setPositionAccuracy(null);
        }}
        onCommunityVote={voteCommunityReport}
        onCommunityDelete={deleteCommunityReport}
        onFinishAreaMeasure={() => setMeasureArea(false)}
        onFinishDistanceMeasure={() => setMeasureDistance(false)}
        onReportZoneComplete={(points) => {
          setReportZoneDrawing(false);
          if (points.length === 0) {
            setReportDraftLocation(null);
            setReportObservedZone(null);
            setReportModalLocation(null);
            return;
          }
          setReportObservedZone(points);
          if (reportDraftLocation && points.length > 0) {
            const latitude = points.reduce((sum, point) => sum + point.latitude, 0) / points.length;
            const longitude = points.reduce((sum, point) => sum + point.longitude, 0) / points.length;
            setReportModalLocation({
              ...reportDraftLocation,
              label: `${reportDrawingType === "line" ? t("mapExperience.boundary") : t("mapExperience.area")} ${t("mapExperience.selected")} · ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
              latitude,
              longitude,
            });
          }
        }}
        onDrawReportArea={(location) => {
          setReportDraftLocation(location);
          setReportObservedZone(null);
          setReportDrawingType("area");
          setReportZoneDrawing(true);
          setSelectedLocation(null);
        }}
        onDrawReportLine={(location) => {
          setReportDraftLocation(location);
          setReportObservedZone(null);
          setReportDrawingType("line");
          setReportZoneDrawing(true);
          setSelectedLocation(null);
        }}
        onReportLocation={(location) => {
          if (!authSession?.user) {
            setAccountOpen(true);
            return;
          }
          setReportDraftLocation(location);
          setReportObservedZone(null);
          setReportModalLocation(location);
        }}
        onMapSelect={(location) => {
          setSelectedLocation(location);
          setSelectedLocationKind("pin");
          setPositionAccuracy(null);
          setSelectedLocationZoom(undefined);
        }}
        onViewChange={setMapView}
        referenceTime={displayedReferenceTime}
        reportZoneDrawing={reportZoneDrawing}
        reportDrawingType={reportDrawingType}
        selectedLocation={selectedLocation}
        selectedLocationKind={selectedLocationKind}
        selectedLocationZoom={selectedLocationZoom}
        showEffis={false}
        showAirQuality={showAirQuality}
        showForest={showForest}
        showForestWeather={showForestWeather}
        showHistory={showHistory}
        showNearbyPlaces={showNearbyPlaces}
        showWind={showWind}
        measureDistance={measureDistance}
        measureArea={measureArea}
        windUnit={mapPreferences.windUnit}
        windObservations={windState.observations}
      />
      <MapSearch
        onMobileOpenChange={setMobileSearchOpen}
        onSelect={(location) => {
          setSelectedLocation(location);
          setSelectedLocationKind("search");
          setPositionAccuracy(null);
        }}
      />
      <details className="group absolute top-3 right-3 z-[710] max-[520px]:hidden" data-testid="map-sources">
        <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1.5 rounded-[8px_6px_9px_7px] border-[1.5px] border-[#263532] bg-white/95 px-2.5 text-[.7rem] font-extrabold text-[#172322] shadow-[2px_2px_0_rgba(23,35,34,.18)] backdrop-blur-md [&::-webkit-details-marker]:hidden">
          <span aria-hidden>ⓘ</span>
          © Sources
          <span className="transition-transform duration-300 group-open:rotate-180" aria-hidden>⌄</span>
        </summary>
        <section className="absolute top-[calc(100%+8px)] right-0 grid w-[min(360px,calc(100vw-24px))] gap-3 rounded-[14px_11px_16px_12px] border-2 border-[#172322] bg-white/97 p-4 text-[#172322] shadow-[4px_5px_0_rgba(23,35,34,.2)] backdrop-blur-xl">
          <div>
            <small className="font-black tracking-[.12em] uppercase">{t("mapExperience.mapSources")}</small>
            <h2 className="mt-1 mb-0 text-lg">{t("mapExperience.whereDoesTheInformationComeFrom")}</h2>
          </div>
          <dl className="m-0 grid gap-2 text-xs [&_dd]:m-0 [&_dd]:text-muted [&_dt]:font-extrabold">
            <div><dt>{t("mapExperience.detectedFires")}</dt><dd>NASA LANCE FIRMS · VIIRS.</dd></div>
            <div><dt>{t("mapExperience.perimetersAndHistory")}</dt><dd>{t("mapExperience.effisAndBdiffSeparateFromRecentDetections")}</dd></div>
            <div><dt>{t("mapExperience.windSmokeAndAirQuality")}</dt><dd>Open-Meteo, Météo-France models and CAMS.</dd></div>
            <div><dt>{t("mapExperience.addressesAndVegetation")}</dt><dd>IGN · Géoplateforme.</dd></div>
            <div><dt>{t("mapExperience.baseMaps")}</dt><dd>Esri, Maxar, Earthstar Geographics and the GIS community.</dd></div>
            <div><dt>{t("mapExperience.communityObservations")}</dt><dd>{t("mapExperience.userContributionsShownAsUnverifiedByDefault")}</dd></div>
          </dl>
          <p className="m-0 border-t border-dashed border-[#263532]/50 pt-3 text-[.68rem] font-bold text-muted">
            {t("mapExperience.aSatelliteDetectionConfirmsNeitherAWildfireNor")}
          </p>
        </section>
      </details>
      <aside
        aria-label={t("mapExperience.informationTypeLegend")}
        className="absolute top-[78px] left-3 z-[495] flex rotate-[-.2deg] items-center gap-2 rounded-[10px_7px_12px_8px] border-[1.5px] border-[#263532] bg-white/92 px-2 py-1.5 text-[.62rem] font-extrabold text-[#172322] shadow-[2px_2px_0_rgba(23,35,34,.16)] backdrop-blur-md max-[520px]:hidden"
        data-testid="map-mini-legend"
      >
        <span className="flex items-center gap-1" title={t("mapExperience.satelliteDetection")}>
          <i className="relative size-3 rounded-full border border-[#d9482f] bg-[#ffe0d5] after:absolute after:inset-[3px] after:rounded-full after:bg-[#ff321f] after:content-['']" />
          <span className="max-[520px]:sr-only">Satellite</span>
        </span>
        <span className="flex items-center gap-1" title={t("mapExperience.estimatedOfficialPerimeter")}>
          <i className="size-3 rotate-[4deg] border border-dashed border-[#84291f] bg-[#f5d8d2]" />
          <span className="max-[520px]:sr-only">{t("mapExperience.official")}</span>
        </span>
        <span className="flex items-center gap-1" title={t("mapExperience.communityReport")}>
          <i className="grid size-3 place-items-center rounded-[45%_55%_48%_52%] border border-[#172322] bg-white text-[.62rem] leading-none text-[#d9482f]">+</i>
          <span className="max-[520px]:sr-only">{t("mapExperience.community")}</span>
        </span>
      </aside>
      {(measureDistance || measureArea) && showMeasureHint && (
        <aside
          aria-live="polite"
          className="pointer-events-none absolute top-[78px] left-1/2 z-650 flex w-max max-w-[calc(100%_-_96px)] -translate-x-1/2 rotate-[-.25deg] items-center gap-3 rounded-[12px_9px_14px_10px] border-2 border-dashed border-[#172322] bg-white px-4 py-3 text-[#172322] shadow-[3px_3px_0_rgba(23,35,34,.2)] max-[520px]:hidden"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-[48%_52%_45%_55%] border-[1.5px] border-[#172322]">
            <SketchIcon name={measureArea ? "area" : "distance"} />
          </span>
          <span className="grid gap-0.5 text-left">
            <strong className="text-sm">{measureArea ? t("mapExperience.measureAnArea") : t("mapExperience.measureADistance")}</strong>
            <small className="text-[.7rem] text-muted">
              <span className="max-[520px]:hidden">{t("mapExperience.clickToAddAPointDoubleClickOr")}</span>
              <span className="hidden max-[520px]:inline">{t("mapExperience.tapTheMapToAddAPointPress")}</span>
            </small>
          </span>
        </aside>
      )}
      {reportZoneDrawing && (
        <aside
          aria-live="polite"
          className="absolute top-[78px] left-1/2 z-650 flex w-max max-w-[calc(100%_-_96px)] -translate-x-1/2 rotate-[-.25deg] items-center gap-3 rounded-[12px_9px_14px_10px] border-2 border-dashed border-[#176f96] bg-white px-4 py-3 text-[#172322] shadow-[3px_3px_0_rgba(23,35,34,.2)] max-[520px]:right-[64px] max-[520px]:left-[max(8px,env(safe-area-inset-left))] max-[520px]:w-auto max-[520px]:max-w-none max-[520px]:translate-x-0 max-[520px]:gap-2 max-[520px]:px-3"
        >
          <span className="grid gap-0.5 text-left">
            <strong className="text-sm">{t("mapExperience.drawTheObservedArea")}</strong>
            <small className="text-[.7rem] text-muted">
              <span className="max-[520px]:hidden">
                {reportDrawingType === "line"
                  ? t("mapExperience.placeAtLeast2PointsPressEnterDouble")
                  : t("mapExperience.placeAtLeast3PointsPressEnterDouble")}
              </span>
              <span className="hidden max-[520px]:inline">
                {reportDrawingType === "line"
                  ? "Place au moins 2 points · Appuie sur ✓ pour valider la limite"
                  : "Place au moins 3 points · Appuie sur ✓ pour valider la zone"}
              </span>
            </small>
          </span>
          <button className="min-h-9 rounded-[8px_6px_9px_7px] border-[1.5px] border-[#263532] bg-transparent px-3 text-xs font-black" onClick={() => {
            setReportZoneDrawing(false);
            setReportDraftLocation(null);
            setReportObservedZone(null);
            setReportModalLocation(null);
          }} type="button">{t("mapExperience.cancel")}</button>
        </aside>
      )}
      {reportModalLocation && (
        <div className="fixed inset-0 z-2000 flex items-end justify-center bg-[rgba(5,20,18,.5)] md:items-center md:p-6">
          <div aria-label={t("mapExperience.newReport")} aria-modal="true" className="sketch-modal-panel relative max-h-[96dvh] w-full max-w-[680px] overflow-y-auto overscroll-contain px-3.5 pt-[18px] pb-[calc(20px+env(safe-area-inset-bottom))] md:max-h-[calc(100dvh_-_48px)]" ref={reportModalPanelRef} role="dialog">
            <CommunityReportForm
              embedded
              isAuthenticated={Boolean(authSession?.user)}
              initialLocation={reportModalLocation}
              initialObservedZone={reportObservedZone}
              onAuthenticationRequired={() => setAccountOpen(true)}
              onClose={() => closeReportModal(() => {
                setReportDraftLocation(null);
                setReportObservedZone(null);
                setReportZoneDrawing(false);
                setSelectedLocation(null);
                setSelectedLocationZoom(undefined);
                setPositionAccuracy(null);
              })}
              onSaved={() => {
                fetch("/api/community/reports", { cache: "no-store" })
                  .then((response) => response.json())
                  .then((payload) => {
                    setCommunityReports(Array.isArray(payload.reports) ? payload.reports : []);
                    if (payload.viewerVotes && typeof payload.viewerVotes === "object") setCommunityVotes(payload.viewerVotes);
                  })
                  .catch(() => undefined);
                closeReportModal(() => {
                  setReportDraftLocation(null);
                  setReportObservedZone(null);
                  setReportZoneDrawing(false);
                  setSelectedLocation(null);
                  setSelectedLocationZoom(undefined);
                  setPositionAccuracy(null);
                });
              }}
            />
          </div>
        </div>
      )}
      {accountOpen && (
        <div
          className="fixed inset-0 z-2000 flex items-end justify-center bg-[rgba(5,20,18,.5)] md:items-center md:p-6"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              closeMobileSheet(accountModalPanelRef.current, () => setAccountOpen(false));
            }
          }}
        >
          <div aria-label={t("mapExperience.signIn")} aria-modal="true" className="sketch-modal-panel relative grid max-h-[96dvh] w-full max-w-[430px] gap-4 overflow-y-auto overscroll-contain px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] md:max-h-[calc(100dvh_-_48px)]" ref={accountModalPanelRef} role="dialog">
            <header className="border-b-[1.5px] border-dashed border-[#263532]/55 pb-3">
              <small className="font-black tracking-[.12em] uppercase">{t("mapExperience.account")}</small>
              <h2 className="m-0 text-xl font-black">{authSession?.user ? t("mapExperience.myAccount") : t("mapExperience.signIn")}</h2>
            </header>
            <button aria-label={t("mapExperience.closeSignIn")} className="absolute top-3 right-3 grid size-9 place-items-center rounded-[51%_49%_46%_54%] border-[1.5px] border-[#172322] bg-white text-2xl" onClick={() => closeMobileSheet(accountModalPanelRef.current, () => setAccountOpen(false))} type="button">×</button>
            <p className="m-0 text-sm leading-relaxed text-muted">
              {authSession?.user
                ? t("mapExperience.welcomeUser", { name: authSession.user.name })
                : t("mapExperience.signInToPublishReportsPhotosOrVideos")}
            </p>
            <AuthAccountPanel
              onAuthenticated={() => {
                closeMobileSheet(accountModalPanelRef.current, () => setAccountOpen(false));
              }}
            />
          </div>
        </div>
      )}
      {informationOpen && (
        <div
          className="fixed inset-0 z-2000 flex items-end justify-center bg-[rgba(5,20,18,.42)] min-[721px]:inset-auto min-[721px]:top-[141px] min-[721px]:right-[84px] min-[721px]:block min-[721px]:bg-transparent"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && window.matchMedia("(max-width: 720px)").matches) {
              closeInformationPanel();
            }
          }}
        >
          <div
            aria-label={t("mapExperience.informationAndSafetyGuidance")}
            aria-modal="true"
            className="information-dialog relative max-h-[84dvh] w-full overflow-y-auto overscroll-contain rounded-t-[20px] border-2 border-[#172322] bg-white pb-[calc(12px+env(safe-area-inset-bottom))] text-[#172322] [overflow-anchor:none] min-[721px]:max-h-[min(calc(100dvh-159px),760px)] min-[721px]:w-[420px] min-[721px]:rounded-[19px_15px_21px_16px] min-[721px]:pb-2"
            ref={informationModalPanelRef}
            role="dialog"
          >
            <button
              aria-label={t("mapExperience.closeInformation")}
              className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-[51%_49%_46%_54%] border-[1.5px] border-[#172322] bg-white text-2xl text-ink shadow-[1px_1px_0_rgba(23,35,34,.2)]"
              onClick={closeInformationPanel}
              type="button"
            >
              ×
            </button>
            <InformationContent
              onOpenEmergency={() => {
                setInformationOpen(false);
                openEmergencyPanel();
              }}
            />
          </div>
        </div>
      )}
      {emergencyOpen && (
        <div
          className="fixed inset-0 z-2000 flex items-end justify-center bg-[rgba(5,20,18,.5)] md:items-center md:p-6"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) closeEmergencyPanel();
          }}
        >
          <div
            aria-label={t("mapExperience.emergencyNumbers")}
            aria-modal="true"
            className="sketch-modal-panel relative grid max-h-[96dvh] w-full max-w-[470px] gap-4 overflow-y-auto overscroll-contain px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom))] md:max-h-[calc(100dvh_-_48px)]"
            ref={emergencyModalPanelRef}
            role="dialog"
          >
            <header className="border-b-[1.5px] border-dashed border-[#263532]/55 pb-3 pr-11">
              <small className="font-black tracking-[.12em] uppercase">{t("mapExperience.safety")}</small>
              <h2 className="m-0 text-xl font-black">{t("mapExperience.emergencyNumbers")}</h2>
            </header>
            <button
              aria-label={t("mapExperience.close")}
              className="absolute top-3 right-3 grid size-9 place-items-center rounded-[51%_49%_46%_54%] border-[1.5px] border-[#172322] bg-white text-2xl"
              onClick={closeEmergencyPanel}
              type="button"
            >
              ×
            </button>

            <div className="grid gap-1 rounded-[11px_8px_12px_9px] border-[1.5px] border-dashed border-[#263532]/65 p-3">
              <span className="text-xs font-black tracking-[.08em] uppercase">{t("mapExperience.locationUsed")}</span>
              <strong>{detectedEmergencyCountryName ?? t("mapExperience.countryNotDetected")}</strong>
              <span className="text-sm text-muted">
                {selectedLocation
                  ? t("mapExperience.selectedPointOnTheMap")
                  : t("mapExperience.currentMapCentre")}
                {" · "}
                {emergencyLocation.latitude.toFixed(4)}, {emergencyLocation.longitude.toFixed(4)}
              </span>
            </div>

            <label className="grid gap-1.5 text-sm font-bold">
              <span>{t("mapExperience.checkOrChooseTheCountry")}</span>
              <select
                className="min-h-12 w-full rounded-[8px_11px_7px_10px] border-[1.5px] border-[#172322] bg-white px-3 text-base"
                onChange={(event) => {
                  setEmergencyCountryOverride(event.target.value);
                  setEmergencyCallConfirmation(false);
                }}
                value={emergencyNumber ? emergencyCountryCode : ""}
              >
                <option value="">{t("mapExperience.chooseASupportedCountry")}</option>
                {emergencyCountryNames.map((country) => (
                  <option key={country.code} value={country.code}>{country.label}</option>
                ))}
              </select>
            </label>

            {emergencyNumber ? (
              <section className="grid gap-3 rounded-[12px_9px_13px_10px] border-2 border-[#b92f22] bg-[#fff6f2] p-3">
                <div>
                  <span className="block text-xs font-black tracking-[.08em] text-[#8c281f] uppercase">{t("mapExperience.generalEmergency")}</span>
                  <strong className="text-3xl text-[#b92f22]">{emergencyNumber.number}</strong>
                </div>
                {!emergencyCallConfirmation ? (
                  <button
                    className="min-h-12 rounded-[8px_11px_7px_10px] border-2 border-[#172322] bg-[#b92f22] px-4 font-black text-white shadow-[2px_2px_0_rgba(23,35,34,.28)]"
                    onClick={() => setEmergencyCallConfirmation(true)}
                    type="button"
                  >
                    {t("mapExperience.callEmergencyNumber", { number: emergencyNumber.number })}
                  </button>
                ) : (
                  <div className="grid gap-2">
                    <strong>{t("mapExperience.confirmTheEmergencyCall")}</strong>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="min-h-11 rounded-lg border-[1.5px] border-[#172322] bg-white font-bold" onClick={() => setEmergencyCallConfirmation(false)} type="button">{t("mapExperience.back")}</button>
                      <a className="grid min-h-11 place-items-center rounded-lg border-[1.5px] border-[#172322] bg-[#b92f22] font-black text-white no-underline" href={`tel:${emergencyNumber.number}`}>{t("mapExperience.confirm")}</a>
                    </div>
                  </div>
                )}
                <a className="text-xs font-bold text-[#42524f]" href={emergencyNumber.sourceUrl} rel="noreferrer" target="_blank">
                  {t("mapExperience.numberVerifiedBy", { source: emergencyNumber.sourceName })} ↗
                </a>
              </section>
            ) : (
              <p className="m-0 rounded-[10px_8px_11px_9px] border-[1.5px] border-dashed border-[#b92f22] bg-[#fff6f2] p-3 text-sm leading-relaxed">
                {t("mapExperience.firemapsDoesNotYetHaveAVerifiedNumber")}
              </p>
            )}

            <button
              className="min-h-12 rounded-[8px_11px_7px_10px] border-[1.5px] border-[#172322] bg-white px-4 font-bold shadow-[2px_2px_0_rgba(23,35,34,.16)]"
              onClick={() => void copyEmergencyCoordinates()}
              type="button"
            >
              {emergencyCopyStatus === "copied"
                ? t("mapExperience.coordinatesCopied")
                : emergencyCopyStatus === "error"
                  ? t("mapExperience.couldNotCopy")
                  : t("mapExperience.copyCoordinates")}
            </button>
            <p className="m-0 text-xs leading-relaxed text-muted">
              {t("mapExperience.firemapsNeverStartsACallAutomaticallyIfYou")}
            </p>
          </div>
        </div>
      )}
      {!isOnline && <div className="absolute top-0 right-0 left-0 z-800 bg-[#7a2d22] px-3 py-2 text-center text-xs font-extrabold text-white" role="status">{t("mapExperience.offlineVisibleInformationMayBeOutdated")}</div>}
      {(showAirQuality || showNearbyPlaces || showForest || showForestWeather || showHistory) && (
        <div className="absolute top-[78px] left-[13px] z-510 grid max-w-[370px] gap-2 dark:[&>aside]:border-white/25 dark:[&>aside]:bg-[rgba(17,22,21,.9)] dark:[&>aside]:text-white dark:[&_small]:!text-white/60 max-[520px]:left-2.5 max-[520px]:max-w-[calc(100vw_-_76px)]">
          {showAirQuality && (
            <aside className="grid gap-1.5 rounded-[8px_11px_7px_10px] border-[1.5px] border-[#263532] bg-[rgba(255,252,239,.9)] px-[11px] py-[9px] shadow-[3px_3px_0_rgba(23,35,34,.15)] backdrop-blur-lg [&>strong]:text-[.76rem] [&>small]:text-[.62rem] [&>small]:text-muted" aria-label={t("mapExperience.airQualityLegend")}>
              <strong>{t("mapExperience.smokeAndAirQuality")}</strong>
              <div className="air-quality-scale">
                <span><i className="good" />0–20 {t("mapExperience.good")}</span>
                <span><i className="fair" />21–40 {t("mapExperience.fair")}</span>
                <span><i className="moderate" />41–60 {t("mapExperience.moderate")}</span>
                <span><i className="poor" />61–80 {t("mapExperience.poor")}</span>
                <span><i className="very-poor" />81+ {t("mapExperience.veryPoor")}</span>
              </div>
              <small>Estimation CAMS · maille ≈ 11 km</small>
            </aside>
          )}
          {showNearbyPlaces && (
            <aside className="grid gap-1.5 rounded-[8px_11px_7px_10px] border-[1.5px] border-[#263532] bg-[rgba(255,252,239,.9)] px-[11px] py-[9px] shadow-[3px_3px_0_rgba(23,35,34,.15)] backdrop-blur-lg [&>strong]:text-[.76rem] [&>small]:text-[.65rem] [&>small]:text-muted [&>span]:text-[.65rem] [&>span]:text-muted" aria-live="polite">
              <strong>{t("mapExperience.exposedPlaces")} · 15 km</strong>
              {nearbyStatus === "loading" && <span>{t("mapExperience.searching")}</span>}
              {nearbyStatus === "error" && <span>{t("mapExperience.unavailable")} : {nearbyError}</span>}
              {nearbyStatus === "ready" && (
                <>
                  <span>{t(nearbyPlaces.length > 1 ? "mapExperience.placesShown" : "mapExperience.placeShown", { count: nearbyPlaces.length })}</span>
                  <div className="nearby-category-legend">
                    {[...new Set(nearbyPlaces.map((place) => place.category))].map((category) => (
                      <small key={category}>{category}</small>
                    ))}
                  </div>
                </>
              )}
              <small>{t("mapExperience.clickAMarkerForDetails")} · OSM</small>
            </aside>
          )}
          {showForest && (
            <aside className="grid gap-1.5 rounded-[8px_11px_7px_10px] border-[1.5px] border-[#263532] bg-[rgba(255,252,239,.9)] px-[11px] py-[9px] shadow-[3px_3px_0_rgba(23,35,34,.15)] backdrop-blur-lg [&>strong]:text-[.76rem] [&>strong]:text-[#245d35] [&>small]:text-[.65rem] [&>small]:text-muted [&>span]:text-[.65rem] [&>span]:text-muted">
              <strong>{t("mapExperience.ignForestVegetation")}</strong>
              <span>{t("mapExperience.forestStandsAndWoodedAreasFromTheBd")}</span>
              <small>{t("mapExperience.mapInventoryNotARealTimeObservation")}</small>
            </aside>
          )}
          {showForestWeather && (
            <aside className="grid gap-1.5 rounded-[8px_11px_7px_10px] border-[1.5px] border-[#263532] bg-[rgba(255,252,239,.9)] px-[11px] py-[9px] shadow-[3px_3px_0_rgba(23,35,34,.15)] backdrop-blur-lg [&>strong]:text-[.76rem] [&>small]:text-[.65rem] [&>small]:text-muted [&>span]:text-[.65rem] [&>span]:text-muted" aria-live="polite">
              <strong>{t("mapExperience.forestFireDanger")}</strong>
              {forestWeatherState.status === "loading" && <span>{t("mapExperience.loadingMeteoFrance")}</span>}
              {forestWeatherState.status === "error" && <span>{t("mapExperience.dataTemporarilyUnavailable")}</span>}
              {forestWeatherState.status === "ready" && (
                <>
                  <div className="forest-weather-scale">
                    <span><i className="level-1" />{t("mapExperience.low")}</span>
                    <span><i className="level-2" />{t("mapExperience.moderate2")}</span>
                    <span><i className="level-3" />{t("mapExperience.high")}</span>
                    <span><i className="level-4" />{t("mapExperience.veryHigh")}</span>
                  </div>
                  <small>
                    {t("mapExperience.tomorrowPublished")} {new Intl.DateTimeFormat(locale, {
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(forestWeatherState.publishedAt))}
                  </small>
                </>
              )}
              <small>{t("mapExperience.forecastRegionalDangerNotActiveFires")}</small>
            </aside>
          )}
          {showHistory && (
            <aside className="grid gap-1 rounded-[8px_11px_7px_10px] border-[1.5px] border-[#4c2d52] bg-[rgba(250,244,251,.92)] px-[11px] py-[9px] shadow-[3px_3px_0_rgba(44,24,48,.16)] backdrop-blur-lg [&>strong]:text-[.78rem] [&>strong]:text-[#4c2d52] [&>small]:text-[.65rem] [&>small]:text-muted [&>span]:text-[.65rem] [&>span]:text-muted">
              <strong>{t("mapExperience.fireHistory")} · {historyYear}</strong>
              {historyStatus === "zoom" && <span>{t("mapExperience.zoomInToLoadMunicipalities")}</span>}
              {historyStatus === "loading" && <span>{t("mapExperience.loadingBdiff")}</span>}
              {historyStatus === "error" && <span>{t("mapExperience.historyTemporarilyUnavailable")}</span>}
              {historyStatus === "ready" && <span>{t(historyTotal > 1 ? "mapExperience.firesInThisArea" : "mapExperience.fireInThisArea", { count: historyTotal })}</span>}
              <small>{t("mapExperience.bdiffAndOfficialSourcesNotRealTime")}</small>
            </aside>
          )}
        </div>
      )}
      {state.status !== "loading" && (
        <div
          data-testid="map-timeline"
          className={`absolute right-3 bottom-3 left-3 z-510 flex min-h-[68px] items-center gap-[7px] rounded-[27px_24px_29px_25px] border-2 p-[7px_9px] text-[#172322] shadow-[1px_1px_0_rgba(23,35,34,.55),0_0_0_1px_rgba(23,35,34,.7),3px_4px_0_rgba(23,35,34,.18)] backdrop-blur-[7px] after:pointer-events-none after:absolute after:inset-[2px_-3px_-2px_2px] after:rounded-[25px_28px_24px_29px] after:border after:border-[#172322]/42 after:content-[''] [.map-high-contrast_&]:!border-black [.map-high-contrast_&]:!shadow-[0_0_0_2px_#fff,0_0_0_4px_#000] min-[521px]:right-auto min-[521px]:left-1/2 min-[521px]:w-[calc(100%_-_24px)] min-[521px]:max-w-[780px] min-[521px]:-translate-x-1/2 max-[520px]:right-2 max-[520px]:bottom-[calc(8px+env(safe-area-inset-bottom))] max-[520px]:left-2 max-[520px]:min-h-[54px] max-[520px]:gap-[3px] max-[520px]:p-[5px_8px] ${showHistory ? "border-[#4c2d52] bg-[rgba(250,244,251,.95)] [&_input[type=range]]:accent-[#6f3f72]" : "border-white/95 bg-white/95"}`}
          aria-label={t("mapExperience.mapTimeline")}
        >
          <button
            aria-label={(showHistory ? historyPlaying : timelinePlaying) ? t("mapExperience.pauseTimeline") : t("mapExperience.playTimeline")}
            className={timelineControlClass}
            onClick={() => {
              if (showHistory) {
                const lastYear = new Date().getUTCFullYear() - 1;
                if (historyYear >= lastYear) setHistoryYear(2006);
                setHistoryPlaying((playing) => !playing);
              } else {
                if (timelineOffsetHours === 0) setTimelineOffsetHours(timelineMaxHours);
                setTimelinePlaying((playing) => !playing);
              }
            }}
            type="button"
          >
            <SketchIcon name={(showHistory ? historyPlaying : timelinePlaying) ? "pause" : "play"} />
          </button>
          <div className="grid min-w-0 flex-1 gap-px text-center">
            <div className="flex items-baseline justify-center gap-2">
              <strong className="text-[.82rem] capitalize max-[520px]:text-[.72rem]">
                {showHistory
                  ? `${t("mapExperience.bdiffHistory")} · ${historyYear}`
                  : timelineOffsetHours === 0
                  ? `${t("mapExperience.now")} · ${new Date(displayedReferenceTime).toLocaleTimeString(locale, {
                      hour: "2-digit",
                      hour12: mapPreferences.hourFormat === "12",
                      minute: "2-digit",
                      timeZone: mapPreferences.timeZone === "utc" ? "UTC" : undefined,
                    })}`
                  : new Date(displayedReferenceTime).toLocaleTimeString(locale, {
                    hour: "2-digit",
                    hour12: mapPreferences.hourFormat === "12",
                    minute: "2-digit",
                    timeZone: mapPreferences.timeZone === "utc" ? "UTC" : undefined,
                  })}
              </strong>
              <span className="text-[.62rem] font-extrabold text-[#68716f] capitalize">
                {showHistory
                  ? t("mapExperience.2006ToToday")
                  : new Date(displayedReferenceTime).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                      timeZone: mapPreferences.timeZone === "utc" ? "UTC" : undefined,
                    })}
              </span>
            </div>
            <div className="flex justify-between px-1 pt-px text-[.54rem] font-bold text-[#68716f] max-[520px]:hidden" aria-hidden>
              {showHistory
                ? [2006, 2011, 2016, 2021, new Date().getUTCFullYear() - 1].map((year) => <span key={year}>{year}</span>)
                : [1, 0.75, 0.5, 0.25, 0].map((position) => {
                  const hoursAgo = Math.round(timelineMaxHours * position);
                  const labelTime = new Date(referenceTime - hoursAgo * 3_600_000);
                  return (
                    <span key={hoursAgo}>
                      {mapPreferences.timelineRangeDays === 1
                        ? labelTime.toLocaleTimeString(locale, {
                            hour: "2-digit",
                            hour12: mapPreferences.hourFormat === "12",
                            minute: "2-digit",
                            timeZone: mapPreferences.timeZone === "utc" ? "UTC" : undefined,
                          })
                        : labelTime.toLocaleDateString(locale, {
                            day: "numeric",
                            month: "short",
                            timeZone: mapPreferences.timeZone === "utc" ? "UTC" : undefined,
                          })}
                    </span>
                  );
                })}
            </div>
            <div className="timeline-track relative h-[22px] max-[520px]:h-[17px]">
              <input
                aria-label={t("mapExperience.hoursBeforeNow")}
                max={showHistory ? new Date().getUTCFullYear() - 1 : timelineMaxHours}
                min={showHistory ? 2006 : 0}
                onChange={(event) => {
                  if (showHistory) {
                    setHistoryPlaying(false);
                    setHistoryYear(Number(event.target.value));
                  } else {
                    setTimelinePlaying(false);
                    setTimelineOffsetHours(Number(event.target.value));
                  }
                }}
                step="1"
                type="range"
                value={showHistory ? historyYear : timelineOffsetHours}
              />
            </div>
          </div>
          <button
            aria-label={showHistory ? t("mapExperience.goToLatestAvailableYear") : t("mapExperience.returnToNow")}
            className={`${timelineControlClass} rotate-[.7deg] rounded-[47%_53%_52%_48%] disabled:cursor-default disabled:opacity-35`}
            disabled={showHistory ? historyYear === new Date().getUTCFullYear() - 1 : timelineOffsetHours === 0}
            onClick={() => {
              if (showHistory) {
                setHistoryPlaying(false);
                setHistoryYear(new Date().getUTCFullYear() - 1);
              } else {
                setTimelinePlaying(false);
                setTimelineOffsetHours(0);
              }
            }}
            type="button"
          >
            <SketchIcon name="now" />
          </button>
        </div>
      )}
      <nav className="map-side-tools absolute right-[13px] bottom-[140px] z-520 grid gap-2.5 max-[520px]:right-[max(8px,env(safe-area-inset-right))] max-[520px]:bottom-[calc(140px+env(safe-area-inset-bottom))] max-[520px]:gap-[7px]" aria-label="Outils de la carte">
        <button
          aria-expanded={settingsOpen}
          aria-label={t("mapExperience.mapSettings")}
          className={`sketch-tool-button !fixed !right-[max(8px,env(safe-area-inset-right))] !bottom-auto !hidden !bg-white/95 !bg-none !shadow-[1px_1px_0_rgba(23,35,34,.45)] !outline-none before:!hidden max-[520px]:!top-[calc(max(10px,env(safe-area-inset-top))_+_52px)] max-[520px]:!size-[42px] max-[520px]:!transform-none ${mobileSearchOpen ? "max-[520px]:!hidden" : "max-[520px]:!flex"} ${settingsOpen ? "!border-[#d9482f] !text-[#b72d1f]" : "!border-[#172322] !text-[#172322]"}`}
          data-tooltip={t("mapExperience.settings")}
          onClick={() => {
            setSettingsOpen((open) => !open);
            setBaseMapMenuOpen(false);
            setMoreToolsOpen(false);
          }}
          data-settings-trigger
          type="button"
        >
          <SketchIcon name="settings" />
        </button>
        <div className="map-top-tools fixed top-[78px] right-[13px] grid gap-[9px] max-[520px]:!top-auto max-[520px]:right-[max(8px,env(safe-area-inset-right))] max-[520px]:bottom-[calc(239px+env(safe-area-inset-bottom))]">
        <div className="top-tool-group max-[520px]:!hidden">
        <button
          aria-expanded={accountOpen}
          aria-label={authSession?.user ? t("mapExperience.myAccount") : t("mapExperience.signIn2")}
          className={`sketch-tool-button ${accountOpen ? "active" : ""}`}
          data-tooltip={authSession?.user ? t("mapExperience.myAccount") : t("mapExperience.signIn2")}
          onClick={() => {
            setAccountOpen(true);
            setSettingsOpen(false);
            setMoreToolsOpen(false);
          }}
          type="button"
        >
          <SketchIcon name="account" />
        </button>
        </div>
        <div className="top-tool-group max-[520px]:!hidden">
        <button
          aria-expanded={settingsOpen}
          aria-label={t("mapExperience.mapSettings")}
          className={`sketch-tool-button ${settingsOpen ? "active" : ""}`}
          data-settings-trigger
          data-tooltip={t("mapExperience.settings")}
          onClick={() => {
            setSettingsOpen((open) => !open);
            setMoreToolsOpen(false);
          }}
          type="button"
        >
          <SketchIcon name="settings" />
        </button>
        </div>
        <div className="top-tool-group max-[520px]:!hidden">
        <button
          aria-expanded={informationOpen}
          aria-label={t("mapExperience.understandTheMap")}
          className={`sketch-tool-button ${informationOpen ? "active" : ""}`}
          data-information-trigger
          data-tooltip={t("mapExperience.information")}
          onClick={() => setInformationOpen(true)}
          type="button"
        >
          <SketchIcon name="information" />
        </button>
        <button
          aria-label={t("mapExperience.shareThisView")}
          className="sketch-tool-button"
          data-tooltip={shareStatus === "copied" ? t("mapExperience.linkCopied") : shareStatus === "error" ? t("mapExperience.couldNotCopy") : t("mapExperience.share")}
          onClick={() => void shareCurrentView()}
          type="button"
        >
          <SketchIcon name="share" />
        </button>
        </div>
        <div className="top-tool-group max-[520px]:!hidden">
        <button
          aria-label={measureDistance ? t("mapExperience.finishDistanceMeasurement") : t("mapExperience.measureADistance")}
          aria-pressed={measureDistance}
          className={`sketch-tool-button ${measureDistance ? "active" : ""}`}
          data-tooltip={measureDistance ? t("mapExperience.measurementActive") : t("mapExperience.measureADistance")}
          onClick={() => {
            setMeasureArea(false);
            setMeasureDistance((active) => !active);
          }}
          type="button"
        >
          <SketchIcon name="distance" />
        </button>
        <button
          aria-label={measureArea ? t("mapExperience.finishAreaMeasurement") : t("mapExperience.measureAnArea")}
          aria-pressed={measureArea}
          className={`sketch-tool-button ${measureArea ? "active" : ""}`}
          data-tooltip={measureArea ? t("mapExperience.areaMeasurementActive") : t("mapExperience.measureAnArea")}
          onClick={() => {
            setMeasureDistance(false);
            setMeasureArea((active) => !active);
          }}
          type="button"
        >
          <SketchIcon name="area" />
        </button>
        </div>
        <div className="top-tool-group max-[520px]:!hidden">
        <button
          aria-label={t("mapExperience.locateMe")}
          className="sketch-tool-button locate-tool map-locate-tool"
          data-tooltip={t("mapExperience.locateMe")}
          disabled={geolocationStatus === "loading"}
          onClick={locateUser}
          type="button"
        >
          {geolocationStatus === "loading" ? "…" : <SketchIcon name="locate" />}
        </button>
        </div>
        </div>
        <div className="map-primary-tools relative grid rotate-[.45deg] gap-[6px] rounded-[29px_23px_31px_25px/26px_31px_24px_29px] border-2 border-white/90 bg-transparent p-[7px] shadow-[1px_1px_0_rgba(23,35,34,.42),0_0_5px_rgba(23,35,34,.18)] after:pointer-events-none after:absolute after:inset-[1px_-4px_-3px_2px] after:rotate-[.35deg] after:rounded-[31px_25px_28px_23px/24px_30px_25px_31px] after:border after:border-white/50 after:content-[''] max-[520px]:gap-[9px] max-[520px]:rotate-0 max-[520px]:rounded-full max-[520px]:border-0 max-[520px]:p-0 max-[520px]:shadow-none max-[520px]:after:hidden">
        <button
          aria-label={t("mapExperience.locateMe")}
          className="sketch-tool-button locate-tool !hidden max-[520px]:!flex"
          data-tooltip={t("mapExperience.locateMe")}
          disabled={geolocationStatus === "loading"}
          onClick={locateUser}
          type="button"
        >
          {geolocationStatus === "loading" ? "…" : <SketchIcon name="locate" />}
        </button>
        <button
          aria-expanded={baseMapMenuOpen}
          aria-label={t("mapExperience.chooseABaseMap")}
          className={`sketch-tool-button ${baseMapMenuOpen ? "active" : ""}`}
          data-tooltip={`Fond : ${baseMap === "satellite" ? "satellite" : baseMap === "plan" ? "plan" : "relief"}`}
          onClick={() => {
            setBaseMapMenuOpen((open) => !open);
            setMoreToolsOpen(false);
            setSettingsOpen(false);
          }}
          ref={baseMapButtonRef}
          type="button"
        >
          <SketchIcon name="layers" />
        </button>
        <button
          aria-label={darkMap ? t("mapExperience.useLightTheme") : t("mapExperience.useNightTheme")}
          aria-pressed={darkMap}
          className={`sketch-tool-button max-[520px]:!hidden ${darkMap ? "active" : ""}`}
          data-tooltip={darkMap ? t("mapExperience.appearanceNight") : t("mapExperience.appearanceLight")}
          onClick={() => {
            setDarkMap((enabled) => {
              const next = !enabled;
              window.localStorage.setItem(MAP_THEME_KEY, next ? "dark" : "light");
              return next;
            });
          }}
          type="button"
        >
          <SketchIcon name="theme" />
        </button>
        <button
          aria-label={showWind ? t("mapExperience.hideWind") : t("mapExperience.showWind")}
          aria-pressed={showWind}
          className={`sketch-tool-button max-[520px]:!hidden ${showWind ? "active" : ""}`}
          data-tooltip={t("mapExperience.wind")}
          onClick={() => setShowWind((visible) => !visible)}
          type="button"
        >
          <SketchIcon name="wind" />
        </button>
        <button
          aria-expanded={moreToolsOpen}
          aria-label={
            moreToolsOpen
              ? t("mapExperience.closeOtherTools")
              : activeSecondaryToolCount > 0 ? t("mapExperience.showOtherToolsActive", { count: activeSecondaryToolCount }) : t("mapExperience.showOtherTools")
          }
          className={`sketch-tool-button more-tools-button max-[520px]:!transform-none ${moreToolsOpen ? "active" : ""}`}
          data-tooltip={t("mapExperience.otherTools")}
          onClick={() => {
            setMoreToolsOpen((open) => {
              if (!open) setMobileMoreSection("root");
              return !open;
            });
            setBaseMapMenuOpen(false);
            setSettingsOpen(false);
          }}
          ref={moreToolsButtonRef}
          type="button"
        >
          {moreToolsOpen
            ? <span aria-hidden className="text-[1.65rem] leading-none font-normal">×</span>
            : <SketchIcon name="more" />}
          {activeSecondaryToolCount > 0 && !moreToolsOpen && (
            <span
              aria-hidden
              className="absolute -top-1.5 -right-1.5 z-3 grid size-5 rotate-[5deg] place-items-center rounded-[48%_52%_45%_55%] border-2 border-white bg-[#d9482f] text-[.62rem] leading-none font-black text-white shadow-[1px_1px_0_rgba(23,35,34,.45)]"
            >
              {activeSecondaryToolCount}
            </span>
          )}
        </button>
        </div>
          <div
            aria-label={t("mapExperience.chooseABaseMap")}
            className={`invisible absolute right-[72px] bottom-0 grid w-[230px] origin-bottom-right scale-75 gap-2 rounded-[16px_13px_18px_14px] border-2 border-[#172322] bg-white p-3 text-[#172322] shadow-[0_0_0_1px_rgba(255,255,255,.9),2px_2px_0_rgba(23,35,34,.3),0_10px_30px_rgba(0,0,0,.2)] max-[520px]:fixed max-[520px]:right-[max(74px,calc(env(safe-area-inset-right)+74px))] max-[520px]:bottom-[calc(140px+env(safe-area-inset-bottom))] max-[520px]:w-[210px] ${baseMapMenuOpen ? "" : "pointer-events-none"}`}
            ref={baseMapMenuRef}
            role="menu"
          >
            <strong className="border-b border-dashed border-[#172322]/40 pb-2 text-sm">{t("mapExperience.baseMap")}</strong>
            {([
              { label: "Satellite", description: t("mapExperience.aerialImagery"), icon: "satellite", value: "satellite" },
              { label: t("mapExperience.map"), description: t("mapExperience.roadsAndPlaces"), icon: "map", value: "plan" },
              { label: t("mapExperience.terrain"), description: t("mapExperience.terrainAndElevation"), icon: "terrain", value: "terrain" },
            ] as const).map((option) => (
              <button
                aria-checked={!darkMap && baseMap === option.value}
                className={`grid min-h-[52px] cursor-pointer grid-cols-[34px_1fr_auto] items-center gap-2 rounded-[10px_7px_12px_8px] border-[1.5px] px-2.5 py-2 text-left ${
                  !darkMap && baseMap === option.value
                    ? "border-[#d9482f] bg-[#fff1eb]"
                    : "border-[#63706d] bg-transparent"
                }`}
                key={option.value}
                onClick={() => {
                  setBaseMap(option.value);
                  setDarkMap(false);
                  window.localStorage.setItem(MAP_THEME_KEY, "light");
                  setBaseMapMenuOpen(false);
                }}
                role="menuitemradio"
                type="button"
              >
                <span className="grid size-8 place-items-center rounded-[48%_52%_46%_54%] border border-[#172322] bg-white [&_svg]:size-5">
                  <SketchIcon name={option.icon} />
                </span>
                <span className="grid">
                  <strong className="text-xs">{option.label}</strong>
                  <small className="text-[.62rem] text-[#5d6d69]">{option.description}</small>
                </span>
                <span aria-hidden className={`text-base font-black ${!darkMap && baseMap === option.value ? "opacity-100" : "opacity-0"}`}>✓</span>
              </button>
            ))}
            <button
              aria-checked={darkMap}
              className={`grid min-h-[52px] cursor-pointer grid-cols-[34px_1fr_auto] items-center gap-2 rounded-[10px_7px_12px_8px] border-[1.5px] px-2.5 py-2 text-left ${
                darkMap ? "border-[#d9482f] bg-[#172322] text-white" : "border-[#63706d] bg-transparent"
              }`}
              onClick={() => {
                setDarkMap(true);
                window.localStorage.setItem(MAP_THEME_KEY, "dark");
                setBaseMapMenuOpen(false);
              }}
              role="menuitemradio"
              type="button"
            >
              <span className="grid size-8 place-items-center rounded-[48%_52%_46%_54%] border border-current"><SketchIcon name="theme" /></span>
              <span className="grid">
                <strong className="text-xs">{t("mapExperience.night")}</strong>
                <small className={`text-[.62rem] ${darkMap ? "text-white/70" : "text-[#5d6d69]"}`}>{t("mapExperience.darkMap")}</small>
              </span>
              <span aria-hidden className={`text-base font-black ${darkMap ? "opacity-100" : "opacity-0"}`}>✓</span>
            </button>
          </div>
        <MapSettingsPanel
          onChange={setMapPreferences}
          onClose={() => setSettingsOpen(false)}
          open={settingsOpen}
          preferences={mapPreferences}
        />
        <div className={`map-secondary-tools invisible absolute right-[72px] bottom-0 grid w-[330px] max-h-[min(76dvh,690px)] origin-bottom-right scale-75 rotate-[-.08deg] gap-[9px] overflow-y-auto rounded-[19px_15px_21px_16px] border-2 border-[#172322] bg-white p-[13px] text-[#172322] shadow-[0_0_0_1px_rgba(255,255,255,.9),2px_2px_0_1px_rgba(23,35,34,.38),0_10px_34px_rgba(0,0,0,.22)] max-[520px]:fixed max-[520px]:right-[max(5px,env(safe-area-inset-right))] max-[520px]:z-10 max-[520px]:bottom-[calc(70px+env(safe-area-inset-bottom))] max-[520px]:left-auto max-[520px]:w-[min(260px,calc(100vw-18px))] max-[520px]:max-h-[calc(100dvh-150px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-[520px]:rotate-[-.15deg] max-[520px]:rounded-[17px_13px_19px_15px] max-[520px]:border-2 max-[520px]:border-[#172322] max-[520px]:bg-white max-[520px]:p-3 max-[520px]:text-[#172322] max-[520px]:shadow-[0_0_0_1px_rgba(255,255,255,.9),3px_3px_0_rgba(23,35,34,.22),0_10px_30px_rgba(0,0,0,.22)] max-[520px]:[&>.sketch-tool-button]:!rounded-[10px_7px_12px_8px] max-[520px]:[&>.watch-tool>summary]:!rounded-[10px_7px_12px_8px] ${moreToolsOpen ? "" : "pointer-events-none"}`} ref={moreToolsRef}>
          <div className="mb-[3px] flex items-center justify-between border-b-[1.5px] border-dashed border-[rgba(23,35,34,.5)] px-0.5 pt-0.5 pb-2.5">
            <div className="flex items-center gap-2">
              {mobileMoreSection !== "root" && (
                <button className="hidden cursor-pointer border-0 bg-transparent p-0 text-lg font-black max-[520px]:block" onClick={() => setMobileMoreSection("root")} type="button">←</button>
              )}
              <strong className="text-[.95rem]">
                {mobileMoreSection === "layers" ? t("mapExperience.mapLayers") : mobileMoreSection === "measure" ? t("mapExperience.measure") : mobileMoreSection === "sources" ? t("mapExperience.sources") : mobileMoreSection === "watch" ? t("mapExperience.watchAPlace") : t("mapExperience.otherTools")}
              </strong>
            </div>
            <button aria-label={t("mapExperience.close")} className="flex size-8 rotate-[.8deg] cursor-pointer items-center justify-center rounded-[51%_49%_46%_54%] border-[1.5px] border-[#172322] bg-transparent text-[1.4rem] text-[#172322] shadow-[1px_1px_0_rgba(23,35,34,.25)]" onClick={() => setMoreToolsOpen(false)} type="button">×</button>
          </div>
        {mobileMoreSection === "root" && (
          <div className="hidden gap-2 max-[520px]:grid">
            <button className={mobileSecondaryButtonClass} onClick={() => setMobileMoreSection("layers")} type="button">
              <SketchIcon name="layers" /><span>{t("mapExperience.mapLayers")}</span>
              {activeLayerCount > 0 && <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-[48%_52%_45%_55%] border-2 border-white bg-[#d9482f] text-[.62rem] font-black text-white shadow-[1px_1px_0_rgba(23,35,34,.35)]">{activeLayerCount}</span>}
              <span className="ml-auto">›</span>
            </button>
            <button className={mobileSecondaryButtonClass} onClick={() => setMobileMoreSection("measure")} type="button">
              <SketchIcon name="distance" /><span>{t("mapExperience.measure")}</span>
              {activeMeasureCount > 0 && <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-[48%_52%_45%_55%] border-2 border-white bg-[#d9482f] text-[.62rem] font-black text-white shadow-[1px_1px_0_rgba(23,35,34,.35)]">{activeMeasureCount}</span>}
              <span className="ml-auto">›</span>
            </button>
            <button className={mobileSecondaryButtonClass} onClick={() => setMobileMoreSection("watch")} type="button">
              <SketchIcon name="watch" /><span>{t("mapExperience.watchAPlace")}</span>
              {activeWatchCount > 0 && <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-[48%_52%_45%_55%] border-2 border-white bg-[#d9482f] text-[.62rem] font-black text-white shadow-[1px_1px_0_rgba(23,35,34,.35)]">{activeWatchCount}</span>}
              <span className="ml-auto">›</span>
            </button>
            <button className={mobileSecondaryButtonClass} onClick={() => setMobileMoreSection("sources")} type="button">
              <SketchIcon name="sources" /><span>{t("mapExperience.dataSources")}</span>
              <span className="ml-auto">›</span>
            </button>
            <div className="mt-1 flex items-center justify-center gap-3 border-t border-dashed border-[#172322]/40 pt-2">
              <button aria-label={authSession?.user ? "Mon compte" : "Se connecter"} className="grid size-11 rotate-[-.7deg] place-items-center rounded-[48%_52%_46%_54%] border-[1.5px] border-[#263532] bg-transparent shadow-[1px_1px_0_rgba(23,35,34,.18)] [&_svg]:size-5" onClick={() => { setAccountOpen(true); setMoreToolsOpen(false); }} type="button"><SketchIcon name="account" /></button>
              <button aria-label="Informations" className="grid size-11 rotate-[.8deg] place-items-center rounded-[53%_47%_52%_48%] border-[1.5px] border-[#263532] bg-transparent shadow-[1px_1px_0_rgba(23,35,34,.18)] [&_svg]:size-5" onClick={() => { setInformationOpen(true); setMoreToolsOpen(false); }} type="button"><SketchIcon name="information" /></button>
              <button aria-label="Partager" className="grid size-11 rotate-[-.4deg] place-items-center rounded-[46%_54%_49%_51%] border-[1.5px] border-[#263532] bg-transparent shadow-[1px_1px_0_rgba(23,35,34,.18)] [&_svg]:size-5" onClick={() => { void shareCurrentView(); setMoreToolsOpen(false); }} type="button"><SketchIcon name="share" /></button>
            </div>
          </div>
        )}
        {mobileMoreSection === "measure" && (
          <div className="hidden gap-2 max-[520px]:grid">
            <button className={`${mobileSecondaryButtonClass} ${measureDistance ? mobileSecondaryActiveClass : ""}`} onClick={() => { setMeasureArea(false); setMeasureDistance(true); setMoreToolsOpen(false); }} type="button"><SketchIcon name="distance" /><span>{t("mapExperience.measureDistance")}</span></button>
            <button className={`${mobileSecondaryButtonClass} ${measureArea ? mobileSecondaryActiveClass : ""}`} onClick={() => { setMeasureDistance(false); setMeasureArea(true); setMoreToolsOpen(false); }} type="button"><SketchIcon name="area" /><span>{t("mapExperience.measureArea")}</span></button>
          </div>
        )}
        {mobileMoreSection === "layers" && (
          <div className="hidden gap-2 max-[520px]:grid">
            <button className={`${mobileSecondaryButtonClass} ${showWind ? mobileSecondaryActiveClass : ""}`} onClick={() => setShowWind((visible) => !visible)} type="button"><SketchIcon name="wind" /><span>{t("mapExperience.wind")}</span></button>
            <button className={`${mobileSecondaryButtonClass} ${showAirQuality ? mobileSecondaryActiveClass : ""}`} onClick={() => setShowAirQuality((visible) => !visible)} type="button"><SketchIcon name="air" /><span>{t("mapExperience.smokeAndAirQuality")}</span></button>
            <button className={`${mobileSecondaryButtonClass} ${showForestWeather ? mobileSecondaryActiveClass : ""}`} onClick={() => { const visible = !showForestWeather; setShowForestWeather(visible); if (visible && (forestWeatherState.status === "idle" || forestWeatherState.status === "error")) void loadForestWeather(); }} type="button"><SketchIcon name="danger" /><span>{t("mapExperience.wildfireDanger")}</span></button>
            <button className={`${mobileSecondaryButtonClass} ${showNearbyPlaces ? mobileSecondaryActiveClass : ""}`} onClick={() => setShowNearbyPlaces((visible) => { if (!visible) void loadNearbyPlaces(); return !visible; })} type="button"><SketchIcon name="exposed" /><span>{t("mapExperience.exposedPlaces")}</span></button>
            <button className={`${mobileSecondaryButtonClass} ${showForest ? mobileSecondaryActiveClass : ""}`} onClick={() => setShowForest((visible) => !visible)} type="button"><SketchIcon name="forest" /><span>{t("mapExperience.ignVegetation")}</span></button>
            <button className={`${mobileSecondaryButtonClass} ${showHistory ? mobileSecondaryActiveClass : ""}`} onClick={() => { setShowHistory((visible) => !visible); setHistoryPlaying(false); }} type="button"><SketchIcon name="history" /><span>{t("mapExperience.bdiffHistory")}</span></button>
          </div>
        )}
        {mobileMoreSection === "watch" && (
          <div className="hidden gap-2 text-xs max-[520px]:grid">
            <p className="m-0 text-[#5d6d69]">{t("mapExperience.selectAPointOnTheMapOrSearch")}</p>
            {selectedLocation ? (
              <>
                <strong>{selectedLocation.label}</strong>
                <button className={mobileSecondaryButtonClass} onClick={() => { saveSelectedLocation(); setMoreToolsOpen(false); }} type="button"><SketchIcon name="watch" /><span>{t("mapExperience.watchThisPlace")}</span></button>
              </>
            ) : <p className="m-0 rounded-lg border border-dashed border-[#263532] p-2">{t("mapExperience.noPlaceSelected")}</p>}
          </div>
        )}
        {mobileMoreSection === "sources" && (
          <div className="hidden gap-3 text-xs max-[520px]:grid">
            <p className="m-0 font-bold text-[#5d6d69]">{t("mapExperience.theVisibleDatasetsDoNotAllDescribeThe")}</p>
            <dl className="m-0 grid gap-2 [&_dd]:m-0 [&_dd]:text-[#5d6d69] [&_dt]:font-extrabold">
              <div><dt>{t("mapExperience.detectedFires")}</dt><dd>NASA LANCE FIRMS · VIIRS.</dd></div>
              <div><dt>{t("mapExperience.perimetersAndHistory")}</dt><dd>EFFIS and BDIFF.</dd></div>
              <div><dt>{t("mapExperience.windSmokeAndAirQuality")}</dt><dd>Open-Meteo, Météo-France and CAMS.</dd></div>
              <div><dt>{t("mapExperience.addressesAndVegetation")}</dt><dd>IGN · Géoplateforme.</dd></div>
              <div><dt>{t("mapExperience.baseMaps")}</dt><dd>Esri, Maxar, Earthstar and the GIS community.</dd></div>
              <div><dt>{t("mapExperience.communityObservations")}</dt><dd>{t("mapExperience.contributionsAreUnverifiedByDefault")}</dd></div>
            </dl>
            <p className="m-0 border-t border-dashed border-[#263532]/50 pt-3 text-[.68rem] font-bold text-[#5d6d69]">{t("mapExperience.aSatelliteDetectionConfirmsNeitherAWildfireNor")}</p>
          </div>
        )}
        <button
          aria-label={showAirQuality ? t("mapExperience.hideAirQuality") : t("mapExperience.showAirQuality")}
          aria-pressed={showAirQuality}
          className={`sketch-tool-button secondary-tool-row max-[520px]:!hidden ${showAirQuality ? "active" : ""}`}
          data-tooltip={t("mapExperience.smokeAndAirQuality")}
          onClick={() => setShowAirQuality((visible) => !visible)}
          type="button"
        >
          <SketchIcon name="air" />
        </button>
        <details className="watch-tool official-tool max-[520px]:!hidden">
          <summary
            className={`sketch-tool-button ${officialNotices.length ? "active" : ""}`}
            data-tooltip={t("mapExperience.officialGuidance")}
          >
            <SketchIcon name="official" />
          </summary>
          <div className="watch-panel official-panel">
            <strong>{t("mapExperience.officialGuidance")}</strong>
            {officialNoticesStatus === "loading" && <p>{t("mapExperience.searchingVerifiedInformation")}</p>}
            {officialNoticesStatus === "error" && (
              <p className="official-warning">
                {t("mapExperience.theInformationFeedIsNotRespondingCheckLocal")}
              </p>
            )}
            {officialNoticesStatus === "ready" && officialNotices.length === 0 && (
              <p className="official-warning">
                {t("mapExperience.noOfficialGuidanceIsCurrentlyIntegratedIntoThis")}
              </p>
            )}
            {officialNotices.map((notice) => (
              <article className={`official-notice ${notice.severity}`} key={notice.id}>
                <span>{notice.locationLabel}</span>
                <strong>{notice.title}</strong>
                <p>{notice.content}</p>
                {notice.instructions.length > 0 && (
                  <ul>{notice.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ul>
                )}
                <a href={notice.sourceUrl} rel="noreferrer" target="_blank">
                  {t("mapExperience.verifyWith")} {notice.sourceName}
                </a>
              </article>
            ))}
            <p>{t("mapExperience.inAnEmergencyCall112OfficialGuidanceAlways")}</p>
          </div>
        </details>
        <button
          aria-label={showForestWeather ? t("mapExperience.hideForestFireDanger") : t("mapExperience.showForestFireDanger")}
          aria-pressed={showForestWeather}
          className={`sketch-tool-button max-[520px]:!hidden ${showForestWeather ? "active" : ""}`}
          data-tooltip={t("mapExperience.wildfireDanger")}
          onClick={() => {
            const visible = !showForestWeather;
            setShowForestWeather(visible);
            if (visible && (forestWeatherState.status === "idle" || forestWeatherState.status === "error")) {
              void loadForestWeather();
            }
          }}
          type="button"
        >
          <SketchIcon name="danger" />
        </button>
        <button
          aria-label={showNearbyPlaces ? t("mapExperience.hideExposedPlaces") : t("mapExperience.showExposedPlaces")}
          aria-pressed={showNearbyPlaces}
          className={`sketch-tool-button max-[520px]:!hidden ${showNearbyPlaces ? "active" : ""}`}
          data-tooltip={t("mapExperience.exposedPlaces")}
          onClick={() => {
            setShowNearbyPlaces((visible) => {
              if (!visible) void loadNearbyPlaces();
              return !visible;
            });
          }}
          type="button"
        >
          <SketchIcon name="exposed" />
        </button>
        <button
          aria-label={showForest ? t("mapExperience.hideForestVegetation") : t("mapExperience.showForestVegetation")}
          aria-pressed={showForest}
          className={`sketch-tool-button max-[520px]:!hidden ${showForest ? "active" : ""}`}
          data-tooltip={t("mapExperience.ignVegetation")}
          onClick={() => setShowForest((visible) => !visible)}
          type="button"
        >
          <SketchIcon name="forest" />
        </button>
        <button
          aria-label={showHistory ? t("mapExperience.hideFireHistory") : t("mapExperience.showFireHistory")}
          aria-pressed={showHistory}
          className={`sketch-tool-button max-[520px]:!hidden ${showHistory ? "active" : ""}`}
          data-tooltip="Historique BDIFF"
          onClick={() => {
            setShowHistory((visible) => !visible);
            setHistoryPlaying(false);
          }}
          type="button"
        >
          <SketchIcon name="history" />
        </button>
        <details className="watch-tool max-[520px]:!hidden">
          <summary className="sketch-tool-button" data-tooltip={t("mapExperience.watchAPlace")}>
            <SketchIcon name="watch" />
          </summary>
          <div className="watch-panel">
            <strong>{t("mapExperience.watchAPlace")}</strong>
            <p>{t("mapExperience.clickTheMapOrSearchForAnAddress")}</p>
            {selectedLocation ? (
              <div className="location-summary">
                <strong>{selectedLocation.label}</strong>
                {positionAccuracy !== null && <span>{t("mapExperience.accuracy")}: {t("mapExperience.approximately")} {Math.round(positionAccuracy)} m</span>}
                {closestIncident
                  ? <span>{t("mapExperience.nearestDisplayedSignal")}: {formatDistance(closestIncident.distance)}</span>
                  : <span>{t("mapExperience.noDisplayedSignalDuringTheObservedPeriod")}</span>}
                <button className="filter-button" onClick={saveSelectedLocation}>☆ Surveiller ce lieu</button>
              </div>
            ) : <p className="map-click-hint">{t("mapExperience.noPlaceSelected")}</p>}
            {savedLocation && (
              <div className="location-alerts">
                <strong>{savedLocation.label}</strong>
                <label className="layer-toggle">
                  <input
                    checked={alertEnabled}
                    onChange={(event) => void toggleAlerts(event.target.checked)}
                    type="checkbox"
                  />
                  Activer les alertes
                </label>
                <label>
                  <span>{t("mapExperience.radius")}</span>
                  <select
                    disabled={!alertEnabled}
                    onChange={(event) => {
                      const radius = Number(event.target.value);
                      setAlertRadiusKm(radius);
                      setMapPreferences((preferences) => ({
                        ...preferences,
                        alertRadiusKm: radius as MapPreferences["alertRadiusKm"],
                      }));
                      window.localStorage.setItem(ALERT_RADIUS_KEY, String(radius));
                      void syncBackgroundAlert(alertEnabled, savedLocation, radius);
                    }}
                    value={alertRadiusKm}
                  >
                    {[5, 10, 25, 50].map((radius) => <option key={radius} value={radius}>{radius} km</option>)}
                  </select>
                </label>
                <button className="filter-button" onClick={removeSavedLocation}>{t("mapExperience.removeThisPlace")}</button>
                <p className="layer-status">
                  {backgroundAlertStatus === "active" && "Vérification périodique activée. "}
                  {backgroundAlertStatus === "unsupported" && "Arrière-plan non pris en charge. "}
                  {backgroundAlertStatus === "error" && "Activation en arrière-plan impossible. "}
                  {notificationStatus === "denied" && "Notifications bloquées."}
                  {notificationStatus === "unsupported" && "Notifications non prises en charge."}
                </p>
              </div>
            )}
          </div>
        </details>
        </div>
      </nav>
      <div
        data-testid="signal-summary"
        className={`absolute left-3 top-3 z-[500] w-[min(340px,calc(100%-92px))] max-w-[calc(100%-92px)] transition-[width,box-shadow,background-color,border-color] duration-300 max-[720px]:left-[max(8px,env(safe-area-inset-left))] max-[720px]:top-[calc(8px+env(safe-area-inset-top))] max-[720px]:max-w-[calc(100%-76px)] [&_h1]:my-[6px] [&_h1]:mb-1 [&_h1]:text-[1.08rem] [&_p]:my-[3px] [&_p]:text-[.82rem] ${signalSummaryOpen ? "max-h-[calc(100%-94px)] overflow-y-auto rounded-[18px_15px_20px_16px] border-2 border-[#172322] bg-[rgba(255,255,255,.96)] bg-[repeating-linear-gradient(7deg,transparent_0_15px,rgba(23,35,34,.025)_15px_16px,transparent_16px_23px)] shadow-[0_0_0_1px_rgba(255,255,255,.9),1px_1px_0_2px_rgba(23,35,34,.28),5px_6px_0_rgba(23,35,34,.15)] backdrop-blur-[9px] [transform:rotate(-.15deg)] max-[720px]:max-h-[calc(100%-84px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-[720px]:w-[calc(100vw-76px)]" : ""} ${mobileSearchOpen ? "max-[520px]:!hidden" : ""}`}
        aria-live="polite"
      >
        <button
          aria-expanded={signalSummaryOpen}
          className={`relative inline-flex min-h-[54px] cursor-pointer select-none items-center gap-[9px] rounded-[17px_14px_19px_15px] border-2 border-[#172322] bg-[rgba(255,255,255,.96)] px-[11px] py-[7px] pl-2 text-[var(--ink)] shadow-[0_0_0_1px_rgba(255,255,255,.88),3px_3px_0_rgba(23,35,34,.25)] [transform:rotate(-.45deg)] after:pointer-events-none after:absolute after:inset-[2px_-3px_-2px_2px] after:rounded-[15px_18px_14px_19px] after:border after:border-[rgba(23,35,34,.42)] after:content-[''] focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[#8ce1dd] max-[720px]:min-h-[50px] max-[720px]:px-[9px] max-[720px]:py-1.5 max-[720px]:pl-[7px] ${signalSummaryOpen ? "m-1 w-[calc(100%-8px)] transform-none rounded-lg border-transparent bg-transparent shadow-none after:hidden" : ""} ${(isRefreshing || state.status === "loading") ? "signal-summary-loading" : ""}`}
          onClick={() => setSignalSummaryOpen((open) => !open)}
          type="button"
        >
          <span className={`relative flex size-[38px] shrink-0 items-center justify-center overflow-hidden rounded-[48%_52%_44%_56%] border-[1.7px] border-[var(--fire)] bg-[rgba(255,246,242,.98)] text-[var(--fire)] [transform:rotate(-2deg)] [&_.hand-drawn-tool-icon]:size-6 ${isRefreshing ? "after:absolute after:inset-0 after:animate-ping after:rounded-full after:border after:border-[rgba(214,48,38,.35)] after:content-['']" : ""}`}>
            <SketchIcon name="fire" />
          </span>
          <span className="grid text-left leading-[1.05] [&_strong]:text-[.8rem]">
            <strong>
              {state.status === "ready"
                ? `${visibleIncidents.length} ${t(visibleIncidents.length === 1 ? "mapExperience.signal" : "mapExperience.signals")}`
                : state.status === "loading" ? t("mapExperience.searching2") : t("mapExperience.dataUnavailable")}
            </strong>
            <small className="mt-1 text-[.62rem] text-[var(--muted)]">
              {isRefreshing
                ? t("mapExperience.searchingThisArea")
                : state.status === "ready" ? satelliteUpdateLabel : t("mapExperience.tapForDetails")}
            </small>
          </span>
          <span className={`ml-auto font-['Comic_Sans_MS','Bradley_Hand',cursive] text-[1.2rem] transition-transform duration-300 ${signalSummaryOpen ? "rotate-180" : ""}`} aria-hidden>⌄</span>
        </button>
        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${signalSummaryOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="min-h-0 overflow-hidden">
        <div className="border-t-[1.5px] border-dashed border-[rgba(38,53,50,.58)] px-[13px] pb-[13px] pt-[11px]">
        <div className="flex flex-wrap gap-[5px]">
          <span className="badge badge-satellite">🔥 {t("mapExperience.satelliteSignals")}</span>
          <span className={`quality-badge ${dataQuality.className}`}>{dataQuality.label}</span>
        </div>
        {state.status === "loading" && <><h1>{t("mapExperience.searchingForTheLatestDetections")}</h1><p>{t("mapExperience.queryingViirsSensors")}</p></>}
        {state.status === "error" && <><h1>{t("mapExperience.satelliteSourceUnavailable")}</h1><p>{state.message}</p><p>{t("mapExperience.noDisplayedDataDoesNotMeanThereIs")}</p></>}
        {state.status === "ready" && (
          <>
            <h1>{visibleIncidents.length} {t(visibleIncidents.length === 1 ? "mapExperience.recentSignal" : "mapExperience.recentSignals")}</h1>
            <p className="!mt-2 border-l-[3px] border-[var(--fire)] py-1.5 pl-[9px] font-bold leading-[1.4]">
              {visibleIncidents.length === 0
                ? t("mapExperience.noSatelliteSignalIsVisibleDuringTheSelected")
                : priorityZones.some((zone) => zone.summary.trend === "rising")
                  ? t("mapExperience.heatClustersAppearToBeIncreasingLocalVerification")
                  : priorityZones.length >= 3
                    ? t("mapExperience.severalHeatClustersAreVisibleOnTheMap")
                    : t("mapExperience.recentThermalActivityIsVisibleOnTheMap")}
            </p>
            <p className="text-[var(--muted)]">
              <strong>{satelliteUpdateLabel}.</strong>
              <br />
              {latestIncident ? t("mapExperience.latestSignalObserved", { age: formatAge(latestIncident.observedAt, new Date(clock), locale === "fr-FR" ? "fr" : "en") }) : t("mapExperience.noRecentSignalInTheVisibleArea")}
            </p>
          </>
        )}
        {priorityZones.length > 0 && (
          <section className="mt-2 grid gap-1 border-t border-[var(--line)] pt-[7px]" aria-label={t("mapExperience.priorityAreas")}>
            <div className="flex items-center justify-between text-[.72rem]"><strong>{t("mapExperience.areasToReview")}</strong><span className="text-[.62rem] text-[var(--muted)]">{t("mapExperience.satelliteRequiresConfirmation")}</span></div>
            {priorityZones.slice(0, 3).map((zone, index) => (
              <button
                key={zone.id}
                className="flex cursor-pointer items-center gap-2 rounded-[6px_4px_7px_5px] border border-[#79817e] bg-[rgba(255,252,239,.46)] p-1.5 text-left [transform:rotate(-.15deg)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#0d7c86] [&>span:last-child]:grid [&>span:last-child]:gap-0.5 [&_small]:text-[var(--muted)]"
                onClick={() => {
                  setSelectedLocation({
                    id: `zone-${zone.latitude.toFixed(4)}-${zone.longitude.toFixed(4)}`,
                    label: `Zone prioritaire ${index + 1}`,
                    latitude: zone.latitude,
                    longitude: zone.longitude,
                    kind: "pin",
                  });
                  setSelectedLocationKind("pin");
                  setSelectedLocationZoom(12);
                }}
              >
                <span className={`priority-rank priority-${zone.summary.trend}`}>{index + 1}</span>
                <span>
                  <strong>
                    {selectedLocation && zone.distance !== null
                      ? `À ${formatDistance(zone.distance)} de ${selectedLocation.label}`
                      : `Secteur ${zone.latitude.toFixed(2)}, ${zone.longitude.toFixed(2)}`}
                  </strong>
                  <small>
                    {zone.incidents.length} signaux · {zone.summary.trend === "rising" ? "activité en hausse" : zone.summary.trend === "falling" ? "activité en baisse" : "activité observée"}
                  </small>
                </span>
              </button>
            ))}
          </section>
        )}
        <section className="mt-2.5 border-t border-dashed border-[rgba(38,53,50,.55)] pt-2.5">
          <button
            className="flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-[8px_11px_7px_10px] border-[1.5px] border-[#9f3026] bg-[#fff6f2] px-3 py-2 text-left text-[#172322] shadow-[2px_2px_0_rgba(23,35,34,.14)]"
            onClick={openEmergencyPanel}
            type="button"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-[51%_49%_46%_54%] border-[1.5px] border-[#b92f22] text-[#b92f22]">
              <SketchIcon name="official" />
            </span>
            <span className="grid gap-0.5">
              <strong className="text-[.78rem]">{t("mapExperience.needHelp")}</strong>
              <small className="text-[.66rem] text-muted">
                {detectedEmergencyCountryName
                  ? t("mapExperience.emergencyHelpInCountry", { country: detectedEmergencyCountryName })
                  : t("mapExperience.viewVerifiedNumbers")}
              </small>
            </span>
            <span className="ml-auto text-lg" aria-hidden>›</span>
          </button>
        </section>
        {state.status === "ready" && (
          <details className="group/technical mt-[10px] border-t border-[rgba(38,53,50,.45)] pt-[9px]">
            <summary className="cursor-pointer text-[.72rem] font-extrabold text-[#40514e] group-open/technical:mb-[7px]">{t("mapExperience.technicalDetails")}</summary>
            <p>{t("mapExperience.sourceNasaFirmsViirsSensors")}</p>
            <p>{t("mapExperience.theRedAndYellowHaloVisuallyMergesNearby")}</p>
            <p>{satelliteUpdateLabel}{state.partial ? " · résultat partiel" : ""}.</p>
            {deduplicatedIncidents.length < state.incidents.length && (
              <p>{state.incidents.length - deduplicatedIncidents.length} doublon{state.incidents.length - deduplicatedIncidents.length > 1 ? "s" : ""} fusionné{state.incidents.length - deduplicatedIncidents.length > 1 ? "s" : ""}.</p>
            )}
            <div className="mt-[7px] flex items-center justify-between gap-2 text-[.72rem] text-[var(--muted)]">
              <span>Actualisation dans {Math.max(0, Math.ceil((nextRefreshAt - clock) / 60_000))} min</span>
              <button
                className="cursor-pointer rounded-lg border-0 bg-[#e9e7df] px-[9px] py-[7px] text-[.72rem] font-extrabold disabled:cursor-wait disabled:opacity-65"
                disabled={isRefreshing}
                onClick={() => setRefreshRevision((revision) => revision + 1)}
              >
                {isRefreshing ? "Actualisation…" : "↻ Actualiser"}
              </button>
            </div>
            <p className="!mt-1.5 !text-[.72rem] leading-[1.35] text-[var(--muted)]">{t("mapExperience.theThermalHaloIsIndicativeItRepresentsNeither")}</p>
          </details>
        )}
        </div>
        </div>
        </div>
      </div>
    </section>
  );
}
