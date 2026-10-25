import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ outages: [], demo: true });
  }

  const supabase = createSupabaseServerClient();
  const restoredSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from("outage_map")
    .select("id, area_id, area_name, city, province, area_type, psgc_code, status, report_count, latitude, longitude, first_reported_at, restored_at")
    .eq("area_type", "barangay")
    .or(`status.in.(unconfirmed,active),and(status.eq.restored,restored_at.gte.${restoredSince})`)
    .order("first_reported_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ error: "Outage map is unavailable." }, { status: 500 });
  return NextResponse.json({ outages: data });
}
