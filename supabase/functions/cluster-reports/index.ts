import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Supabase Edge Function: Report Clustering Daemon
 *
 * @remarks
 * Triggers the PostgreSQL `cluster_recent_reports()` procedure, which aggregates unclustered
 * citizen outage reports submitted within temporal and spatial sliding windows into unified
 * outage incidents.
 *
 * Security: Protected by a shared secret passed in the `x-cron-secret` header.
 *
 * @param request - HTTP POST request with `x-cron-secret` header.
 * @returns {Promise<Response>} JSON response indicating the number of reports clustered.
 */
Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const secret = Deno.env.get("CLUSTER_CRON_SECRET");
  if (!secret || request.headers.get("x-cron-secret") !== secret) return new Response("Unauthorized", { status: 401 });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return new Response("Function is not configured", { status: 500 });

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("cluster_recent_reports");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ reportsClustered: data });
});
