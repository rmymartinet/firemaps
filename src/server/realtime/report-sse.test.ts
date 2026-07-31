import { describe, expect, it } from "vitest";
import type { ReportDeletedEvent } from "@/domain/report-realtime-event";
import {
  serializeReportSseEvent,
  serializeSseConnectionEvent,
  serializeSseHeartbeat,
} from "./report-sse";

describe("sérialisation Server-Sent Events", () => {
  it("sérialise un événement métier au format SSE", () => {
    const event = {
      id: "event-123",
      reportId: "report-456",
      timestamp: "2026-07-29T10:00:00.000Z",
      type: "report.deleted",
    } satisfies ReportDeletedEvent;

    expect(serializeReportSseEvent(event)).toBe(
      `id: event-123\n`
      + `event: report.deleted\n`
      + `data: ${JSON.stringify(event)}\n\n`,
    );
  });

  it("indique au navigateur le délai de reconnexion", () => {
    expect(serializeSseConnectionEvent("2026-07-29T10:00:00.000Z")).toBe(
      "retry: 3000\n"
      + "event: connected\n"
      + 'data: {"timestamp":"2026-07-29T10:00:00.000Z"}\n\n',
    );
  });

  it("sérialise le heartbeat comme un commentaire SSE", () => {
    expect(serializeSseHeartbeat()).toBe(": heartbeat\n\n");
  });
});
