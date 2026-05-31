type SnapshotPayload = {
  deviceId: string;
  snapshot: Record<string, unknown>;
  appVersion?: string;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return { url, serviceRoleKey };
}

export function isSupabaseConfigured() {
  const { url, serviceRoleKey } = getSupabaseConfig();
  return Boolean(url && serviceRoleKey);
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
