import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("PUSH_CRON_SECRET");
  if (!secret || request.headers.get("x-cron-secret") !== secret) return new Response("Unauthorized", { status: 401 });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT");
  if (!url || !serviceKey || !publicKey || !privateKey || !subject) return new Response("Function is not configured", { status: 500 });

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: notifications, error } = await supabase.from("notifications")
    .select("id, user_id, message, kind")
    .is("delivered_at", null)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let delivered = 0;
  for (const notification of notifications ?? []) {
    const { data: subscriptions } = await supabase.from("push_subscriptions").select("id, subscription").eq("user_id", notification.user_id);
    let sent = false;
    for (const item of subscriptions ?? []) {
      try {
        await webpush.sendNotification(item.subscription, JSON.stringify({
          title: notification.kind === "outage_restored" ? "Power restored" : "Outage reported nearby",
          body: notification.message,
          url: "/",
        }));
        sent = true;
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) await supabase.from("push_subscriptions").delete().eq("id", item.id);
      }
    }
    if (sent) {
      await supabase.from("notifications").update({ delivered_at: new Date().toISOString() }).eq("id", notification.id);
      delivered += 1;
    }
  }

  return Response.json({ notificationsDelivered: delivered });
});
