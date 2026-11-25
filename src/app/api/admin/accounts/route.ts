import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Validation schema for administrator account management actions:
 * - `invite`: Invites a new user via Supabase Auth email.
 * - `promote`: Escalates a confirmed user to the `admin` role.
 * - `demote`: Reverts an administrator to a regular `user` role.
 */
const mutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("invite"), email: z.string().trim().email().max(254) }),
  z.object({ action: z.literal("promote"), userId: z.string().uuid() }),
  z.object({ action: z.literal("demote"), userId: z.string().uuid() }),
]);

/**
 * Verifies that the requesting user is authenticated and holds verified administrator credentials.
 *
 * @returns {Promise<{ ok: true, supabase: SupabaseClient, user: User } | { ok: false, response: NextResponse }>}
 * Authorization result or standard forbidden/unauthorized response.
 */
async function authorizeAdmin() {
  const supabase = await createSupabaseServerClient();
  const authorization = await requireAdmin(supabase);
  if (!authorization.ok) return authorization;
  return { ok: true, supabase, user: authorization.user } as const;
}

/**
 * Enforces sliding-window rate limiting on sensitive administrative mutations (5 actions/minute per admin).
 *
 * @param userId - Unique identifier of the calling administrator.
 * @returns {Promise<NextResponse | null>} Null if rate limit is respected, or HTTP 429/503 response if violated/unavailable.
 */
async function enforceRateLimit(userId: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "admin-account-management",
    });
    const result = await limiter.limit(userId);
    if (!result.success) {
      return NextResponse.json({ error: "Too many account-management requests. Try again shortly." }, { status: 429 });
    }
    return null;
  } catch {
    return NextResponse.json({ error: "Administrator rate limiting is unavailable; try again later." }, { status: 503 });
  }
}

/**
 * Retrieves user profiles and the administrative account audit log.
 *
 * @returns {Promise<NextResponse>} JSON response containing `profiles` and `audit` records (HTTP 200),
 * or an error status (HTTP 401, 403, 429, 500).
 *
 * @security Admin - Requires active administrator session and role.
 */
export async function GET() {
  const authorization = await authorizeAdmin();
  if (!authorization.ok) return authorization.response;
  const limited = await enforceRateLimit(authorization.user.id);
  if (limited) return limited;

  const [{ data: profiles, error: profileError }, { data: audit, error: auditError }] = await Promise.all([
    authorization.supabase.from("profiles").select("id, name, email, role, created_at").order("email").limit(500),
    authorization.supabase.from("admin_account_audit").select("id, actor_id, actor_label, target_id, action, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  if (profileError || auditError) {
    return NextResponse.json({ error: "Administrator accounts could not be loaded." }, { status: 500 });
  }
  return NextResponse.json({ profiles, audit }, { headers: { "Cache-Control": "no-store" } });
}

/**
 * Performs administrative account management mutations (invite, promote, demote).
 *
 * @param request - Next.js HTTP request containing the JSON mutation action and parameters.
 * @returns {Promise<NextResponse>} Success message (HTTP 200) or error status (HTTP 400, 401, 403, 429, 500, 502, 503).
 *
 * @remarks
 * In addition to strict role verification:
 * - `invite`: Uses Supabase Auth Admin Service Role API to invite users, recording an audit event.
 * - `promote` / `demote`: Executes the `admin_set_account_role` database function, preventing demotion of the last remaining admin and enforcing email verification.
 *
 * @security Admin - Requires active administrator session and role.
 */
export async function POST(request: NextRequest) {
  const authorization = await authorizeAdmin();
  if (!authorization.ok) return authorization.response;

  const limited = await enforceRateLimit(authorization.user.id);
  if (limited) return limited;

  const body = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Provide a valid invitation email or account action." }, { status: 400 });
  }

  if (body.data.action === "invite") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: "Invitations are not configured on the server." }, { status: 503 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return NextResponse.json({ error: "Set NEXT_PUBLIC_APP_URL to configure invitation redirects." }, { status: 503 });
    let redirectTo: string;
    try {
      const parsedAppUrl = new URL(appUrl);
      if (parsedAppUrl.protocol !== "https:" && parsedAppUrl.hostname !== "localhost") throw new Error("Invalid app URL");
      redirectTo = new URL("/login", parsedAppUrl.origin).toString();
    } catch {
      return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL must be a valid HTTPS URL (or localhost during development)." }, { status: 503 });
    }

    const adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(body.data.email, { redirectTo });
    if (inviteError) {
      if (/already registered|already been registered|user exists/i.test(inviteError.message)) {
        return NextResponse.json({
          ok: true,
          message: "If that address can receive a new invitation, it will arrive shortly. Existing confirmed accounts can be promoted from the account list.",
        });
      }
      return NextResponse.json({ error: "The invitation could not be sent. Check Supabase Auth email configuration and try again." }, { status: 502 });
    }
    if (!data.user) {
      return NextResponse.json({ error: "Supabase accepted the invitation but returned no account identifier; contact an administrator before retrying." }, { status: 502 });
    }

    const { error: auditError } = await authorization.supabase.rpc("admin_record_account_invitation", {
      p_target_id: data.user.id,
    });
    if (auditError) {
      return NextResponse.json({
        error: "The invitation email may have been sent, but its audit record could not be saved. Do not retry; contact another administrator to reconcile the audit.",
      }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: "Invitation sent. The account remains a regular user until an administrator promotes it after email confirmation." });
  }

  const role = body.data.action === "promote" ? "admin" : "user";
  const { data, error } = await authorization.supabase.rpc("admin_set_account_role", {
    p_target_id: body.data.userId,
    p_role: role,
  });
  if (error) {
    const message = error.message.includes("last administrator")
      ? "The last administrator cannot be demoted."
      : error.message.includes("email must be confirmed")
        ? "The account email must be confirmed before changing its role."
        : error.message.includes("Account not found")
          ? "The account is no longer available."
          : "The account role could not be changed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, message: data === "unchanged" ? "The account already has that role." : "Account role updated." });
}
