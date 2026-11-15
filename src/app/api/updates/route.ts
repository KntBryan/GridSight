import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
