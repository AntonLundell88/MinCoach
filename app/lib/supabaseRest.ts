type SnapshotPayload = {
  deviceId: string;
  snapshot: Record<string, unknown>;
  appVersion?: string;
};

type FeedbackPayload = {
  deviceId: string;
  message: string;
  metadata?: Record<string, unknown>;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return { url, serviceRoleKey };
}

export function getSupabaseHealth() {
  const { url, serviceRoleKey } = getSupabaseConfig();
  let host: string | null = null;

  try {
    host = url ? new URL(url).host : null;
  } catch {
    host = "invalid-url";
  }

  return {
    configured: Boolean(url && serviceRoleKey),
    hasUrl: Boolean(url),
    hasServiceRoleKey: Boolean(serviceRoleKey),
    host,
  };
}

export function isSupabaseConfigured() {
  return getSupabaseHealth().configured;
}

export async function upsertBetaDeviceSnapshot({
  deviceId,
  snapshot,
  appVersion = "beta-localstorage-v1",
}: SnapshotPayload) {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return { mode: "disabled" as const };
  }

  const now = new Date().toISOString();
  const response = await fetch(
    `${url}/rest/v1/beta_device_snapshots?on_conflict=device_id`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify([
        {
          device_id: deviceId,
          snapshot,
          app_version: appVersion,
          last_seen_at: now,
          updated_at: now,
        },
      ]),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase beta sync failed: ${response.status} ${errorText.slice(0, 240)}`
    );
  }

  return { mode: "saved" as const };
}

export async function insertBetaFeedback({
  deviceId,
  message,
  metadata = {},
}: FeedbackPayload) {
  const { url, serviceRoleKey } = getSupabaseConfig();

  if (!url || !serviceRoleKey) {
    return { mode: "disabled" as const };
  }

  const response = await fetch(`${url}/rest/v1/beta_feedback`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify([
      {
        device_id: deviceId,
        message,
        metadata,
      },
    ]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Supabase beta feedback failed: ${response.status} ${errorText.slice(0, 240)}`
    );
  }

  return { mode: "saved" as const };
}
