"use client";

import { getOrCreateBetaDeviceId } from "./betaSync";
import { postBetaJsonWithQueue } from "./betaSyncQueue";

export async function sendBetaFeedback(
  message: string,
  metadata: Record<string, unknown> = {}
) {
  if (typeof window === "undefined") return undefined;

  const result = await postBetaJsonWithQueue({
    endpoint: "/api/beta-feedback",
    storageKey: "mincoachBetaFeedbackSyncStatus",
    label: "Feedback",
    unique: true,
    body: {
      deviceId: getOrCreateBetaDeviceId(),
      message,
      metadata: {
        ...metadata,
        page: window.location.href,
        userAgent: window.navigator.userAgent,
        sentAt: new Date().toISOString(),
      },
    },
  });

  if (!result?.ok && !result?.queued) {
    throw new Error("Feedback kunde inte skickas.");
  }

  return result;
}
