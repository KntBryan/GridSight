import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function requireAdmin(supabase: ServerSupabaseClient) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, response: NextResponse.json({ error: "Sign in required." }, { status: 401 }) } as const;
  }
  if (!user.email_confirmed_at) {
    return { ok: false, response: NextResponse.json({ error: "Confirm your account email before using administrator features." }, { status: 403 }) } as const;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    return { ok: false, response: NextResponse.json({ error: "Administrator access could not be verified." }, { status: 503 }) } as const;
  }
  if (profile?.role !== "admin") {
    return { ok: false, response: NextResponse.json({ error: "Admin access required." }, { status: 403 }) } as const;
  }

  const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError) {
    return { ok: false, response: NextResponse.json({ error: "Your MFA status could not be verified." }, { status: 503 }) } as const;
  }
  if (assurance.currentLevel !== "aal2") {
    return { ok: false, response: NextResponse.json({ error: "Verify an MFA challenge before using administrator features.", code: "MFA_REQUIRED" }, { status: 403 }) } as const;
  }

  return { ok: true, user } as const;
}
