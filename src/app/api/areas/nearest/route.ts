import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const parsed = z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
  }).safeParse({ latitude: params.get("latitude"), longitude: params.get("longitude") });
  if (!parsed.success) return NextResponse.json({ error: "Valid coordinates are required." }, { status: 400 });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Area lookup is not configured." }, { status: 503 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("find_barangay_at_location", {
    p_latitude: parsed.data.latitude,
    p_longitude: parsed.data.longitude,
  }).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "No Surigao City barangay contains these coordinates." }, { status: 404 });
  return NextResponse.json({ area: data });
}
