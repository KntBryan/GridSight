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
  const { data: notifications, error } = await supabase.rpc("claim_push_notifications", { p_limit: 100 });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let delivered = 0;
  for (const notification of notifications ?? []) {
    const { data: subscriptions, error: subscriptionError } = await supabase.from("push_subscriptions")
      .select("id, subscription")
      .eq("user_id", notification.user_id);
    if (subscriptionError) {
      const { error: finishError } = await supabase.rpc("finish_push_notification", {
        p_notification_id: notification.id,
        p_delivered: false,
        p_error: "Push subscriptions could not be loaded.",
      });
      if (finishError) return Response.json({ error: "Could not update push delivery state." }, { status: 500 });
      continue;
    }

    let sent = false;
    let deliveryError = subscriptions?.length ? "Push delivery failed." : "No active push subscriptions.";
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
        if (statusCode === 404 || statusCode === 410) {
          const { error: deleteError } = await supabase.from("push_subscriptions").delete().eq("id", item.id);
          if (deleteError) deliveryError = "An expired push subscription could not be removed.";
        }
      }
    }

    const { error: finishError } = await supabase.rpc("finish_push_notification", {
      p_notification_id: notification.id,
      p_delivered: sent,
      p_error: sent ? null : deliveryError,
    });
    if (finishError) return Response.json({ error: "Could not update push delivery state." }, { status: 500 });
    if (sent) {
      delivered += 1;
    }
  }

  return Response.json({ notificationsDelivered: delivered });
});
