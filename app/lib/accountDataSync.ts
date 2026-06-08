"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  buildBetaLocalSnapshot,
  getOrCreateBetaDeviceId,
  isRecord,
  restoreBetaSnapshotData,
} from "./betaSync";

const ACCOUNT_SYNC_STATUS_KEY = "mincoachAccountSyncStatus";

type AccountSyncStatus = {
  at: string;
  ok: boolean;
  mode: "saved" | "restored" | "empty" | "error";
  restoredKeys?: string[];
  message?: string;
};

function writeAccountSyncStatus(status: AccountSyncStatus) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNT_SYNC_STATUS_KEY, JSON.stringify(status));
}

export function readAccountSyncStatus() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ACCOUNT_SYNC_STATUS_KEY);
    return raw ? (JSON.parse(raw) as AccountSyncStatus) : null;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Okänt fel";
}

export async function saveLocalBetaDataToAccount(args: {
  supabase: SupabaseClient;
  user: User;
  appTheme: "dark" | "light";
}) {
  const { supabase, user, appTheme } = args;
  const now = new Date().toISOString();
  const betaDeviceId = getOrCreateBetaDeviceId();
  const snapshot = buildBetaLocalSnapshot({
    reason: "account-import",
    accountUserId: user.id,
  });

  try {
    const { error: settingsError } = await supabase.from("user_settings").upsert(
      {
        user_id: user.id,
        app_theme: appTheme,
        settings: {
          betaDeviceId,
          betaSnapshot: snapshot,
          importedAt: now,
          source: "local-beta-device",
        },
        updated_at: now,
      },
      { onConflict: "user_id" }
    );

    if (settingsError) throw settingsError;

    const { error: importError } = await supabase.from("account_imports").insert({
      user_id: user.id,
      beta_device_id: betaDeviceId,
      import_type: "local_device",
      status: "completed",
      imported_keys: Object.keys(snapshot.data ?? {}),
      metadata: {
        appVersion: "beta-localstorage-v1",
        importedAt: now,
      },
      completed_at: now,
    });

    if (importError) throw importError;

    const status: AccountSyncStatus = {
      at: now,
      ok: true,
      mode: "saved",
    };
    writeAccountSyncStatus(status);
    return status;
  } catch (error) {
    const status: AccountSyncStatus = {
      at: new Date().toISOString(),
      ok: false,
      mode: "error",
      message: getErrorMessage(error),
    };
    writeAccountSyncStatus(status);
    return status;
  }
}

export async function restoreAccountDataToLocalDevice(args: {
  supabase: SupabaseClient;
  user: User;
}) {
  const { supabase, user } = args;

  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("settings, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    const settings = data?.settings;
    const snapshot =
      isRecord(settings) && isRecord(settings.betaSnapshot)
        ? settings.betaSnapshot
        : null;

    if (!snapshot) {
      const status: AccountSyncStatus = {
        at: new Date().toISOString(),
        ok: true,
        mode: "empty",
        restoredKeys: [],
      };
      writeAccountSyncStatus(status);
      return status;
    }

    const restoredKeys = restoreBetaSnapshotData(snapshot);
    const status: AccountSyncStatus = {
      at: new Date().toISOString(),
      ok: true,
      mode: "restored",
      restoredKeys,
    };
    writeAccountSyncStatus(status);
    return status;
  } catch (error) {
    const status: AccountSyncStatus = {
      at: new Date().toISOString(),
      ok: false,
      mode: "error",
      message: getErrorMessage(error),
    };
    writeAccountSyncStatus(status);
    return status;
  }
}
