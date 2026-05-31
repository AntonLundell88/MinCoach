"use client";

import { getOrCreateBetaDeviceId } from "./betaSync";

export async function sendBetaFeedback(
  message: string,
  metadata: Record<string, unknown> = {}
) {
  if (typeof window === "undefined") return undefined;

  const response = await fetch("/api/beta-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId: getOrCreateBetaDeviceId(),
      message,
      metadata: {
        ...metadata,
        page: window.location.href,
        userAgent: window.navigator.userAgent,
        sentAt: new Date().toISOString(),
      },
    }),
    keepalive: true,
  });

  const result = (await response.json().catch(() => null)) as
    | { ok?: boolean; mode?: string; message?: string }
    | null;

  if (!response.ok || result?.ok === false) {
    throw new Error(result?.message || "Feedback kunde inte skickas.");
  }

  return result;
}
