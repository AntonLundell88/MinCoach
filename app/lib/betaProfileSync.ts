"use client";

import { getOrCreateBetaDeviceId } from "./betaSync";
import { postBetaJsonWithQueue, type BetaSyncStatus } from "./betaSyncQueue";

async function postProfileSync(
  key: string,
  label: string,
  body: Record<string, unknown>
): Promise<BetaSyncStatus | undefined> {
  if (typeof window === "undefined") return undefined;

  return postBetaJsonWithQueue({
    endpoint: "/api/beta-profile",
    storageKey: key,
    label,
    body: {
      deviceId: getOrCreateBetaDeviceId(),
      ...body,
    },
  });
}

export function syncStructuredBetaProfile(profile: Record<string, unknown>) {
  return postProfileSync("mincoachBetaProfileSyncStatus", "Profil", {
    kind: "profile",
    profile,
  });
}

export function syncStructuredBetaProgram(args: {
  profile: Record<string, unknown>;
  plan: Record<string, unknown>;
  source?: string;
}) {
  return postProfileSync("mincoachBetaProgramSyncStatus", "Upplägg", {
    kind: "program",
    profile: args.profile,
    plan: args.plan,
    source: args.source ?? "ai",
  });
}
