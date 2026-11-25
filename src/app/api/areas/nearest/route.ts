import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reverse-geocodes GPS coordinates to identify the matching Surigao City barangay.
 *
 * @remarks
 * Validates the `latitude` and `longitude` query parameters using Zod, then executes
 * the PostgreSQL/PostGIS stored procedure `find_barangay_at_location` to perform
 * spatial polygon intersection (`ST_Contains`).
 * Rejects pins outside the official boundaries of Surigao City's 54 pilot barangays.
 *
 * @security Authenticated - Requires an active Supabase user session.
 *
 * @param request - Next.js HTTP request containing `latitude` and `longitude` query params.
 * @returns {Promise<NextResponse>} JSON response with the resolved `area` record (HTTP 200),
 * or error information (HTTP 400 for invalid coordinates, 401 if unauthenticated, 404 if out-of-bounds, 503 if unconfigured).
 */
export async function GET(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Area lookup is not configured." }, { status: 503 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to use report location lookup." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const parsed = z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
  }).safeParse({ latitude: params.get("latitude"), longitude: params.get("longitude") });
  if (!parsed.success) return NextResponse.json({ error: "Valid coordinates are required." }, { status: 400 });

  const { data, error } = await supabase.rpc("find_barangay_at_location", {
    p_latitude: parsed.data.latitude,
    p_longitude: parsed.data.longitude,
  }).maybeSingle();
  if (error || !data) return NextResponse.json({ error: "No Surigao City barangay contains these coordinates." }, { status: 404 });
  return NextResponse.json({ area: data });
}
