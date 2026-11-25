import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Retrieves clustered power outage incidents for the live interactive map.
 *
 * @remarks
 * Queries the `outage_map` view for barangay-level incidents in Surigao City.
 * Filters for ongoing outages (`unconfirmed` or `active`), plus outages `restored`
 * within the last 24 hours to provide situational awareness of recent power restorations.
 *
 * @security Authenticated - Requires an active Supabase user session (enforced by migration 0020).
 *
 * @returns {Promise<NextResponse>} JSON response containing an array of `outages` records (HTTP 200),
 * or an error message (HTTP 401, 500, or 503).
 */
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Outage map is not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to view the outage map." }, { status: 401 });
  }

  const restoredSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from("outage_map")
    .select("id, area_id, area_name, city, province, area_type, psgc_code, status, report_count, latitude, longitude, first_reported_at, restored_at")
    .eq("area_type", "barangay")
    .or(`status.in.(unconfirmed,active),and(status.eq.restored,restored_at.gte.${restoredSince})`)
    .order("first_reported_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: "Outage map is unavailable." }, { status: 500 });
  return NextResponse.json({ outages: data }, { headers: { "Cache-Control": "private, no-store" } });
}
