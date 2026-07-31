import { startReportEventRelay } from "@/server/realtime/report-cross-instance-relay";
import { reportEventBus } from "@/server/realtime/report-event-bus";
import {
  serializeReportSseEvent,
  serializeSseConnectionEvent,
  serializeSseHeartbeat,
} from "@/server/realtime/report-sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const REPORT_SSE_HEARTBEAT_INTERVAL_MS = 20_000;

export async function GET(request: Request) {
  startReportEventRelay();
  const encoder = new TextEncoder();
  let cleanup = () => undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let active = true;

      const enqueue = (message: string) => {
        if (!active) return;
        try {
          controller.enqueue(encoder.encode(message));
        } catch {
          cleanup();
        }
      };

      const unsubscribe = reportEventBus.subscribe((event) => {
        enqueue(serializeReportSseEvent(event));
      });

      const heartbeat = setInterval(() => {
        enqueue(serializeSseHeartbeat());
      }, REPORT_SSE_HEARTBEAT_INTERVAL_MS);

      const dispose = () => {
        if (!active) return false;
        active = false;
        clearInterval(heartbeat);
        request.signal.removeEventListener("abort", abort);
        unsubscribe();
        return true;
      };

      const abort = () => {
        if (dispose()) controller.close();
      };

      cleanup = () => {
        dispose();
      };

      request.signal.addEventListener("abort", abort, { once: true });
      enqueue(serializeSseConnectionEvent());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
