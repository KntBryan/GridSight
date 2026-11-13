import { NextRequest, NextResponse } from "next/server";
import { safeReturnPath } from "@/lib/auth/return-path.mjs";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const returnTo = safeReturnPath(request.nextUrl.searchParams.get("next"));
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", returnTo);
    loginUrl.searchParams.set("authError", "confirmation");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", returnTo);
    loginUrl.searchParams.set("authError", "confirmation");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(returnTo, request.url));
}
