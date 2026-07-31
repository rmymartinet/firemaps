"use client";

import { useEffect, useRef, useState } from "react";
import {
  parseReportRealtimeEvent,
  REPORT_REALTIME_EVENT_TYPES,
  type ReportRealtimeEvent,
} from "@/domain/report-realtime-event";

export type ReportEventsConnectionStatus = "idle" | "connecting" | "open" | "error";

export function useReportEvents(
  onEvent: (event: ReportRealtimeEvent) => void,
  enabled = true,
): ReportEventsConnectionStatus {
  const onEventRef = useRef(onEvent);
  const [status, setStatus] = useState<ReportEventsConnectionStatus>("connecting");

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets a stale status before reconnecting, same shape as React's documented chat-room example
    setStatus("connecting");
    const eventSource = new EventSource("/api/community/reports/events");

    const handleConnected = () => setStatus("open");
    const handleError = () => setStatus("error");
    const handleReportEvent = (message: MessageEvent<string>) => {
      const event = parseReportRealtimeEvent(message.data);
      if (event) onEventRef.current(event);
    };

    eventSource.addEventListener("connected", handleConnected);
    eventSource.addEventListener("error", handleError);
    for (const eventType of REPORT_REALTIME_EVENT_TYPES) {
      eventSource.addEventListener(eventType, handleReportEvent as EventListener);
    }

    return () => {
      eventSource.removeEventListener("connected", handleConnected);
      eventSource.removeEventListener("error", handleError);
      for (const eventType of REPORT_REALTIME_EVENT_TYPES) {
        eventSource.removeEventListener(eventType, handleReportEvent as EventListener);
      }
      eventSource.close();
    };
  }, [enabled]);

  return enabled ? status : "idle";
}

