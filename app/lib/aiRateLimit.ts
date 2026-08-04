type AiRouteKind = "set" | "chat" | "program" | "exercise_intro";

type UsageBucket = {
  count: number;
  resetAt: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const LIMITS: Record<AiRouteKind, number> = {
  set: 300,
  chat: 180,
  program: 80,
  exercise_intro: 150,
};

const store = globalThis as typeof globalThis & {
  __mincoachAiUsage?: Map<string, UsageBucket>;
};

function getUsageStore() {
  if (!store.__mincoachAiUsage) {
    store.__mincoachAiUsage = new Map();
  }

  return store.__mincoachAiUsage;
}

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const sessionId = request.headers.get("x-mincoach-session")?.trim();

  return sessionId || forwardedFor || realIp || "local";
}

export function checkAiRateLimit(request: Request, kind: AiRouteKind) {
  const now = Date.now();
  const limit = LIMITS[kind];
  const resetAt = now + DAY_MS;
  const key = `${kind}:${getClientKey(request)}:${new Date(now)
    .toISOString()
    .slice(0, 10)}`;
  const usage = getUsageStore();
  const bucket = usage.get(key);

  if (!bucket || bucket.resetAt <= now) {
    usage.set(key, { count: 1, resetAt });
    return { allowed: true, limit, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return { allowed: false, limit, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  usage.set(key, bucket);

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}
