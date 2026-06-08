import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  isSupabaseServerConfigured,
} from "@/app/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") ? next : "/";

  if (!code || !isSupabaseServerConfigured()) {
    return NextResponse.redirect(`${requestUrl.origin}/?auth=failed`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${requestUrl.origin}/?auth=failed`);
  }

  return NextResponse.redirect(`${requestUrl.origin}${safeNext}`);
}
