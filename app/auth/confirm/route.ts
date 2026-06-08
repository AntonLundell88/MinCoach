import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  isSupabaseServerConfigured,
} from "@/app/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = requestUrl.searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") ? next : "/";

  if (!tokenHash || !type || !isSupabaseServerConfigured()) {
    return NextResponse.redirect(`${requestUrl.origin}/?auth=failed`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    return NextResponse.redirect(`${requestUrl.origin}/?auth=failed`);
  }

  return NextResponse.redirect(`${requestUrl.origin}${safeNext}`);
}
