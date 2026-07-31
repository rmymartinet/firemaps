import { isCommunityReport, type CommunityReport } from "./community-report";

export const REPORT_REALTIME_EVENT_TYPES = [
  "report.created",
  "report.updated",
  "report.deleted",
  "report.vote-updated",
] as const;

export type ReportRealtimeEventType = (typeof REPORT_REALTIME_EVENT_TYPES)[number];

type ReportRealtimeEventMetadata = {
  /** Identifiant unique du message réseau, distinct de celui du signalement. */
  id: string;
  /** Date d’émission par le serveur, sérialisée au format ISO 8601. */
  timestamp: string;
  /** Identifiant du signalement concerné par le message. */
  reportId: string;
};

export type ReportCreatedEvent = ReportRealtimeEventMetadata & {
  type: "report.created";
  data: CommunityReport;
};

export type ReportUpdatedEvent = ReportRealtimeEventMetadata & {
  type: "report.updated";
  data: CommunityReport;
};

export type ReportDeletedEvent = ReportRealtimeEventMetadata & {
  type: "report.deleted";
};

export type ReportVoteUpdatedEvent = ReportRealtimeEventMetadata & {
  type: "report.vote-updated";
  data: {
    confirms: number;
    disputes: number;
    score: number;
  };
};

/**
 * Union discriminée représentant tous les messages métier diffusés par le
 * futur flux Server-Sent Events des signalements communautaires.
 */
export type ReportRealtimeEvent =
  | ReportCreatedEvent
  | ReportUpdatedEvent
  | ReportDeletedEvent
  | ReportVoteUpdatedEvent;

/**
 * Forme publiée par les routes métier. Le bus ajoutera lui-même les métadonnées
 * propres au transport (`id` et `timestamp`).
 */
export type ReportRealtimeEventInput =
  | Omit<ReportCreatedEvent, "id" | "timestamp">
  | Omit<ReportUpdatedEvent, "id" | "timestamp">
  | Omit<ReportDeletedEvent, "id" | "timestamp">
  | Omit<ReportVoteUpdatedEvent, "id" | "timestamp">;

export function parseReportRealtimeEvent(raw: string): ReportRealtimeEvent | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object") return null;
    const event = value as Partial<ReportRealtimeEvent> & { data?: unknown };
    if (typeof event.id !== "string"
      || typeof event.timestamp !== "string"
      || typeof event.reportId !== "string"
      || !REPORT_REALTIME_EVENT_TYPES.includes(event.type as ReportRealtimeEventType)) {
      return null;
    }

    if (event.type === "report.deleted") return event as ReportDeletedEvent;
    if (event.type === "report.created" || event.type === "report.updated") {
      return isCommunityReport(event.data) ? event as ReportCreatedEvent | ReportUpdatedEvent : null;
    }
    if (event.type === "report.vote-updated") {
      const data = event.data as Partial<ReportVoteUpdatedEvent["data"]> | undefined;
      return data
        && typeof data.confirms === "number"
        && typeof data.disputes === "number"
        && typeof data.score === "number"
        ? event as ReportVoteUpdatedEvent
        : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function applyReportRealtimeEvent(
  reports: CommunityReport[],
  event: ReportRealtimeEvent,
): CommunityReport[] {
  if (event.type === "report.deleted") {
    return reports.filter((report) => report.id !== event.reportId);
  }

  if (event.type === "report.vote-updated") {
    return reports.map((report) => report.id === event.reportId
      ? {
          ...report,
          confirms: event.data.confirms,
          disputes: event.data.disputes,
        }
      : report);
  }

  const existing = reports.find((report) => report.id === event.reportId);
  const nextReport = existing?.ownedByViewer
    ? { ...event.data, ownedByViewer: true }
    : event.data;

  return existing
    ? reports.map((report) => report.id === event.reportId ? nextReport : report)
    : [nextReport, ...reports];
}
