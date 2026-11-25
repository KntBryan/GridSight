import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Whitelisted Web Push server origins to prevent SSRF and malicious endpoint poisoning.
 */
const allowedPushHosts = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
  "notify.windows.com",
]);

/**
 * Zod validation schema for browser Web Push API subscriptions.
 * Validates endpoint URL, port, protocol, domain whitelisting, and encryption keys.
 */
const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).refine((value) => {
    const endpoint = new URL(value);
    return endpoint.protocol === "https:" && !endpoint.port && !endpoint.username && !endpoint.password && allowedPushHosts.has(endpoint.hostname);
  }),
  keys: z.object({ p256dh: z.string().min(20).max(256).regex(/^[A-Za-z0-9_-]+$/), auth: z.string().min(10).max(128).regex(/^[A-Za-z0-9_-]+$/) }),
});

/**
 * Registers or updates a Web Push subscription for the authenticated user.
 *
 * @param request - Next.js HTTP request containing JSON push subscription payload ({ endpoint, keys }).
 * @returns {Promise<NextResponse>} JSON response indicating success ({ ok: true }) or error status (400, 401, 413, 500).
 *
 * @remarks
 * Validates the payload size (<= 16KB), checks the authenticated session,
 * validates against `subscriptionSchema` and whitelisted browser push services,
 * and upserts the record into the `push_subscriptions` database table on `endpoint` conflict.
 *
 * @security Authenticated - Requires a valid Supabase user session.
 */
export async function POST(request: NextRequest) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > 16 * 1024) {
    return NextResponse.json({ error: "Push subscription request is too large." }, { status: 413 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: user.id,
    endpoint: parsed.data.endpoint,
    subscription: parsed.data,
  }, { onConflict: "endpoint" });
  if (error) return NextResponse.json({ error: "Could not save push subscription." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * Unregisters an existing Web Push subscription for the authenticated user.
 *
 * @param request - Next.js HTTP request with `endpoint` query parameter.
 * @returns {Promise<NextResponse>} JSON response indicating success ({ ok: true }) or error status (400, 401, 500).
 *
 * @remarks
 * Validates the URL structure of the `endpoint` query param, confirms the user session,
 * and removes matching records owned by `user.id` from `push_subscriptions`.
 *
 * @security Authenticated - Requires a valid Supabase user session.
 */
export async function DELETE(request: NextRequest) {
  const endpoint = z.string().url().safeParse(new URL(request.url).searchParams.get("endpoint"));
  if (!endpoint.success) return NextResponse.json({ error: "Invalid push endpoint." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint.data);
  if (error) return NextResponse.json({ error: "Could not remove push subscription." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
