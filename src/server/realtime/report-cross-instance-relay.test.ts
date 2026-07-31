import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Handler = (...args: unknown[]) => void;
type ConnectBehavior = "reject" | "resolve";

const { connectBehaviors, FakeClient, instances } = vi.hoisted(() => {
  const instances: FakeClientInstance[] = [];
  const connectBehaviors: ConnectBehavior[] = [];

  class FakeClient {
    connect = vi.fn(() => this.connectResult);
    connectResult: Promise<void>;
    query = vi.fn(() => this.queryResult);
    queryResult: Promise<unknown> = Promise.resolve();
    private readonly handlers: Record<string, Handler[]> = {};

    constructor(public options: unknown) {
      const behavior = connectBehaviors.shift() ?? "resolve";
      this.connectResult = behavior === "resolve" ? Promise.resolve() : Promise.reject(new Error("connect failed"));
      instances.push(this);
    }

    on(event: string, handler: Handler) {
      (this.handlers[event] ??= []).push(handler);
      return this;
    }

    trigger(event: string, ...args: unknown[]) {
      for (const handler of this.handlers[event] ?? []) handler(...args);
    }
  }

  type FakeClientInstance = InstanceType<typeof FakeClient>;

  return { connectBehaviors, FakeClient, instances };
});

vi.mock("pg", () => ({ Client: FakeClient }));

async function flushMicrotasks() {
  for (let i = 0; i < 5; i += 1) await Promise.resolve();
}

describe("startReportEventRelay reconnection", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    instances.length = 0;
    connectBehaviors.length = 0;
    delete (globalThis as Record<string, unknown>).firemapsReportEventRelayClient;
    delete (globalThis as Record<string, unknown>).firemapsReportEventRelayReconnectTimer;
    delete (globalThis as Record<string, unknown>).firemapsReportEventRelayBackoffMs;
    process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.DATABASE_URL;
  });

  it("double le délai de reconnexion après des échecs de connexion successifs", async () => {
    connectBehaviors.push("reject", "reject", "resolve");
    const { startReportEventRelay } = await import("./report-cross-instance-relay");

    startReportEventRelay();
    await flushMicrotasks();
    expect(instances).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(999);
    await flushMicrotasks();
    expect(instances).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    await flushMicrotasks();
    expect(instances).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(1_999);
    await flushMicrotasks();
    expect(instances).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    await flushMicrotasks();
    expect(instances).toHaveLength(3);
  });

  it("réinitialise le délai au minimum après une reconnexion réussie", async () => {
    connectBehaviors.push("reject", "resolve", "resolve");
    const { startReportEventRelay } = await import("./report-cross-instance-relay");

    startReportEventRelay();
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(1_000);
    await flushMicrotasks();
    expect(instances).toHaveLength(2);

    instances[1].trigger("end");
    await vi.advanceTimersByTimeAsync(999);
    await flushMicrotasks();
    expect(instances).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    await flushMicrotasks();
    expect(instances).toHaveLength(3);
  });

  it("n'ouvre pas de seconde connexion tant que la première est active", async () => {
    connectBehaviors.push("resolve");
    const { startReportEventRelay } = await import("./report-cross-instance-relay");

    startReportEventRelay();
    startReportEventRelay();
    await flushMicrotasks();

    expect(instances).toHaveLength(1);
  });
});
