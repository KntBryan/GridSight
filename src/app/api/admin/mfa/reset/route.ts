import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Resets all enrolled TOTP Multi-Factor Authentication factors for the calling administrator.
 *
 * @returns {Promise<NextResponse>} JSON response indicating number of factors deleted (HTTP 200),
 * or an error status (HTTP 401, 403, 500).
 *
 * @remarks
 * Allows administrators whose TOTP credentials became desynchronized, orphaned, or duplicated
 * to wipe their registered auth factors and complete clean enrollment.
 * Uses the Supabase Auth Admin Service Role API to safely manage factor deletion.
 *
 * @security Admin - Requires active administrator session with confirmed email.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (!user.email_confirmed_at) {
    return NextResponse.json(
      { error: "Confirm your account email before configuring MFA." },
      { status: 403 }
    );
  }

  // Verify the user is an admin in profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Server service-role credentials not configured." },
      { status: 500 }
    );
  }

  const adminClient = createClient(url, serviceKey);

  // List existing factors
  const { data: factorData, error: listError } = await adminClient.auth.admin.mfa.listFactors({
    userId: user.id,
  });

  if (listError) {
    return NextResponse.json(
      { error: listError.message || "Could not list existing factors." },
      { status: 500 }
    );
  }

  // Delete all existing TOTP factors for this user
  const deletedIds: string[] = [];
  for (const factor of factorData?.factors || []) {
    const { error: delError } = await adminClient.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId: user.id,
    });
    if (!delError) {
      deletedIds.push(factor.id);
    }
  }

  return NextResponse.json({
    ok: true,
    deletedCount: deletedIds.length,
    message: "All existing MFA factors cleared. You can now enroll a fresh authenticator.",
  });
}

