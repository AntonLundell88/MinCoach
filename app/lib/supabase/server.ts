import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getSupabaseServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return { publishableKey, url };
}

export function isSupabaseServerConfigured() {
  const { publishableKey, url } = getSupabaseServerConfig();
  return Boolean(url && publishableKey);
}

export async function createSupabaseServerClient() {
  const { publishableKey, url } = getSupabaseServerConfig();

  if (!url || !publishableKey) {
    throw new Error("Supabase server auth is not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies. Route handlers can.
        }
      },
    },
  });
}
