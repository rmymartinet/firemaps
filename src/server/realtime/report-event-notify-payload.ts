import type { CommunityReport } from "@/domain/community-report";
import {
  REPORT_REALTIME_EVENT_TYPES,
  type ReportRealtimeEvent,
  type ReportRealtimeEventType,
} from "@/domain/report-realtime-event";

/** Limite pg_notify (8000 octets) avec une marge pour l'enveloppe JSON. */
export const MAX_NOTIFY_PAYLOAD_BYTES = 7800;

export type ReportEventNotifyStub = {
  id: string;
  reportId: string;
  timestamp: string;
  type: ReportRealtimeEventType;
  truncated: true;
};

export type ReportEventNotifyPayload = {
  instanceId: string;
  event: ReportRealtimeEvent | ReportEventNotifyStub;
};

function toStub(event: ReportRealtimeEvent): ReportEventNotifyStub {
  return {
    id: event.id,
    reportId: event.reportId,
    timestamp: event.timestamp,
    truncated: true,
    type: event.type,
  };
}

export function encodeNotifyPayload(event: ReportRealtimeEvent, instanceId: string): string {
  const full = JSON.stringify({ event, instanceId } satisfies ReportEventNotifyPayload);
  if (Buffer.byteLength(full, "utf8") <= MAX_NOTIFY_PAYLOAD_BYTES) return full;

  return JSON.stringify({ event: toStub(event), instanceId } satisfies ReportEventNotifyPayload);
}

function isStub(value: unknown): value is ReportEventNotifyStub {
  if (!value || typeof value !== "object") return false;
  const stub = value as Partial<ReportEventNotifyStub>;
  return stub.truncated === true
    && typeof stub.id === "string"
    && typeof stub.reportId === "string"
    && typeof stub.timestamp === "string"
    && REPORT_REALTIME_EVENT_TYPES.includes(stub.type as ReportRealtimeEventType);
}

/** Validation minimale : la forme complète est déjà garantie côté émetteur par `ReportEventBus`. */
function isFullEvent(value: unknown): value is ReportRealtimeEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<ReportRealtimeEvent>;
  return typeof event.id === "string"
    && typeof event.reportId === "string"
    && typeof event.timestamp === "string"
    && REPORT_REALTIME_EVENT_TYPES.includes(event.type as ReportRealtimeEventType);
}

export function decodeNotifyPayload(raw: string): ReportEventNotifyPayload | null {
  try {
    const value = JSON.parse(raw) as Partial<ReportEventNotifyPayload> | null;
    if (!value || typeof value.instanceId !== "string") return null;
    if (isStub(value.event)) return { event: value.event, instanceId: value.instanceId };
    if (isFullEvent(value.event)) return { event: value.event, instanceId: value.instanceId };
    return null;
  } catch {
    return null;
  }
}

export function isNotifyStub(event: ReportEventNotifyPayload["event"]): event is ReportEventNotifyStub {
  return isStub(event);
}

/** Reconstruit l'événement complet à partir d'un stub tronqué en relisant le signalement. */
export async function resolveNotifiedEvent(
  event: ReportRealtimeEvent | ReportEventNotifyStub,
  fetchReport: (reportId: string) => Promise<CommunityReport | null>,
): Promise<ReportRealtimeEvent | null> {
  if (!isStub(event)) return event;
  if (event.type === "report.deleted") {
    return { id: event.id, reportId: event.reportId, timestamp: event.timestamp, type: "report.deleted" };
  }

  const report = await fetchReport(event.reportId);
  if (!report) return null;

  if (event.type === "report.vote-updated") {
    return {
      data: { confirms: report.confirms, disputes: report.disputes, score: report.confirms - report.disputes },
      id: event.id,
      reportId: event.reportId,
      timestamp: event.timestamp,
      type: "report.vote-updated",
    };
  }

  return {
    data: report,
    id: event.id,
    reportId: event.reportId,
    timestamp: event.timestamp,
    type: event.type,
  } as ReportRealtimeEvent;
}
