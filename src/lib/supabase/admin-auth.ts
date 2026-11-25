import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Type alias for an authenticated server-side Supabase client instance.
 */
type ServerSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * Authorizes that the requesting client is an authenticated administrator meeting all security gates.
 *
 * @param supabase - An initialized server-side Supabase client with request cookie context.
 * @returns {Promise<{ ok: true, user: User } | { ok: false, response: NextResponse }>}
 * Object with authenticated `user` if all checks pass, or failure with pre-formatted `NextResponse`.
 *
 * @remarks
 * Strict 4-step administrative verification gate:
 * 1. Valid authentication session via `supabase.auth.getUser()`.
 * 2. Confirmed user email address (`email_confirmed_at`).
 * 3. Verified `admin` role in the `profiles` table.
 * 4. Two-Factor Authenticator Assurance Level 2 (`aal2`) verification.
 *
 * @security Admin - Enforces AAL2 MFA and role checks across all admin API endpoints and SSR actions.
 */
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
