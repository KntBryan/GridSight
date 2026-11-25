import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Retrieves the latest official community updates and power advisories.
 *
 * @remarks
 * Fetches published broadcasts authored by verified city operations staff from the
 * `community_updates` table. Results are ordered newest-first and limited to the
 * latest 50 entries. Withdrawn notices are excluded from this public feed.
 *
 * @security Public - Accessible without authentication.
 *
 * @returns {Promise<NextResponse>} JSON response containing the `updates` array (HTTP 200),
 * or an error payload (HTTP 500).
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("community_updates")
      .select("id, title, message, category, audience, outage_id, estimated_time, next_update_time, state, correction_note, author_name, author_role, published_at")
      .eq("state", "published")
      .order("published_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ updates: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load community updates.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

