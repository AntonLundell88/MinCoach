import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function getSupabaseBrowserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return { publishableKey, url };
}

export function isSupabaseBrowserConfigured() {
  const { publishableKey, url } = getSupabaseBrowserConfig();
  return Boolean(url && publishableKey);
}

export function createSupabaseBrowserClient() {
  const { publishableKey, url } = getSupabaseBrowserConfig();

  if (!url || !publishableKey) {
    throw new Error("Supabase browser auth is not configured.");
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url, publishableKey);
  }

  return browserClient;
}
