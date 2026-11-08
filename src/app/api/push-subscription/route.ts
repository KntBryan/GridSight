import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedPushHosts = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
  "notify.windows.com",
]);

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).refine((value) => {
    const endpoint = new URL(value);
    return endpoint.protocol === "https:" && !endpoint.port && !endpoint.username && !endpoint.password && allowedPushHosts.has(endpoint.hostname);
  }),
  keys: z.object({ p256dh: z.string().min(20).max(256).regex(/^[A-Za-z0-9_-]+$/), auth: z.string().min(10).max(128).regex(/^[A-Za-z0-9_-]+$/) }),
});

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
