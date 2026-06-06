"use client";

type QueueBody = Record<string, unknown>;

export type BetaSyncQueueItem = {
  id: string;
  endpoint: string;
  body: QueueBody;
  storageKey: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  lastError?: string;
};

export type BetaSyncStatus = {
  at: string;
  httpStatus?: number;
  ok: boolean;
  queued?: boolean;
  label?: string;
  result: unknown;
};

export type BetaSyncQueueSummary = {
  at?: string;
  pending: number;
  flushed?: number;
  failed?: number;
};

const QUEUE_KEY = "mincoachBetaSyncQueue";
const QUEUE_STATUS_KEY = "mincoachBetaQueueStatus";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readQueue(): BetaSyncQueueItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is BetaSyncQueueItem => {
          return (
            isRecord(item) &&
            typeof item.id === "string" &&
            typeof item.endpoint === "string" &&
            isRecord(item.body) &&
            typeof item.storageKey === "string" &&
            typeof item.label === "string"
          );
        })
      : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: BetaSyncQueueItem[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(0, 80)));
  writeQueueSummary({ pending: queue.length });
}

function writeQueueSummary(summary: BetaSyncQueueSummary) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    QUEUE_STATUS_KEY,
    JSON.stringify({
      at: new Date().toISOString(),
      ...summary,
    })
  );
}

function stableQueueId(
  endpoint: string,
  body: QueueBody,
  storageKey: string,
  unique = false
) {
  if (unique) {
    return `${endpoint}:${storageKey}:${Date.now()}:${Math.random()
      .toString(16)
      .slice(2)}`;
  }

  const workout = isRecord(body.workout) ? body.workout : null;
  if (typeof workout?.id === "string") {
    return `${endpoint}:workout:${workout.id}`;
  }

  const kind = typeof body.kind === "string" ? body.kind : storageKey;
  return `${endpoint}:${kind}:${storageKey}`;
}

function queueItem(args: {
  endpoint: string;
  body: QueueBody;
  storageKey: string;
  label: string;
  error?: string;
  unique?: boolean;
}) {
  if (typeof window === "undefined") return;

  const now = new Date().toISOString();
  const id = stableQueueId(
    args.endpoint,
    args.body,
    args.storageKey,
    args.unique
  );
  const existing = readQueue().filter((item) => item.id !== id);
  const previous = readQueue().find((item) => item.id === id);

  writeQueue([
    ...existing,
    {
      id,
      endpoint: args.endpoint,
      body: args.body,
      storageKey: args.storageKey,
      label: args.label,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
      attempts: (previous?.attempts ?? 0) + 1,
      lastError: args.error,
    },
  ]);
}

function removeQueuedItem(endpoint: string, body: QueueBody, storageKey: string) {
  const id = stableQueueId(endpoint, body, storageKey);
  writeQueue(readQueue().filter((item) => item.id !== id));
}

export function getBetaSyncQueueSummary(): BetaSyncQueueSummary {
  if (typeof window === "undefined") return { pending: 0 };

  try {
    const raw = window.localStorage.getItem(QUEUE_STATUS_KEY);
    const parsed = raw ? (JSON.parse(raw) as BetaSyncQueueSummary) : null;
    return {
      ...(parsed ?? {}),
      pending: readQueue().length,
    };
  } catch {
    return { pending: readQueue().length };
  }
}

export async function postBetaJsonWithQueue(args: {
  endpoint: string;
  body: QueueBody;
  storageKey: string;
  label: string;
  unique?: boolean;
}): Promise<BetaSyncStatus | undefined> {
  if (typeof window === "undefined") return undefined;

  try {
    const response = await fetch(args.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args.body),
      keepalive: true,
    });

    const result = (await response.json().catch(() => null)) as unknown;
    const status: BetaSyncStatus = {
      at: new Date().toISOString(),
      httpStatus: response.status,
      ok: response.ok,
      queued: false,
      label: args.label,
      result,
    };

    if (response.ok) {
      removeQueuedItem(args.endpoint, args.body, args.storageKey);
    } else {
      queueItem({
        ...args,
        error: `HTTP ${response.status}`,
      });
      status.queued = true;
    }

    window.localStorage.setItem(args.storageKey, JSON.stringify(status));
    return status;
  } catch {
    queueItem({
      ...args,
      error: "network-error",
    });

    const status: BetaSyncStatus = {
      at: new Date().toISOString(),
      ok: false,
      queued: true,
      label: args.label,
      result: "network-error",
    };
    window.localStorage.setItem(args.storageKey, JSON.stringify(status));
    return status;
  }
}

export async function flushBetaSyncQueue() {
  if (typeof window === "undefined") return { pending: 0 };

  const queue = readQueue();
  if (queue.length === 0) {
    writeQueueSummary({ pending: 0, flushed: 0, failed: 0 });
    return { pending: 0, flushed: 0, failed: 0 };
  }

  const remaining: BetaSyncQueueItem[] = [];
  let flushed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const response = await fetch(item.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.body),
        keepalive: true,
      });
      const result = (await response.json().catch(() => null)) as unknown;

      if (response.ok) {
        flushed += 1;
        window.localStorage.setItem(
          item.storageKey,
          JSON.stringify({
            at: new Date().toISOString(),
            httpStatus: response.status,
            ok: true,
            queued: false,
            label: item.label,
            result,
          } satisfies BetaSyncStatus)
        );
      } else {
        failed += 1;
        remaining.push({
          ...item,
          attempts: item.attempts + 1,
          updatedAt: new Date().toISOString(),
          lastError: `HTTP ${response.status}`,
        });
      }
    } catch {
      failed += 1;
      remaining.push({
        ...item,
        attempts: item.attempts + 1,
        updatedAt: new Date().toISOString(),
        lastError: "network-error",
      });
    }
  }

  writeQueue(remaining);
  writeQueueSummary({ pending: remaining.length, flushed, failed });
  return { pending: remaining.length, flushed, failed };
}
