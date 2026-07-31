import type { ReportRealtimeEvent } from "@/domain/report-realtime-event";

export function serializeReportSseEvent(event: ReportRealtimeEvent): string {
  return [
    `id: ${event.id}`,
    `event: ${event.type}`,
    `data: ${JSON.stringify(event)}`,
    "",
    "",
  ].join("\n");
}

export function serializeSseConnectionEvent(timestamp = new Date().toISOString()): string {
  return [
    "retry: 3000",
    "event: connected",
    `data: ${JSON.stringify({ timestamp })}`,
    "",
    "",
  ].join("\n");
}

export function serializeSseHeartbeat(): string {
  return ": heartbeat\n\n";
}
