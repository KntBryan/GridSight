import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const overrideSchema = z.object({ status: z.enum(["unconfirmed", "active", "restored"]) });

export async function PATCH(request: NextRequest, { params }: { params: { outageId: string } }) {
  const id = z.string().uuid().safeParse(params.outageId);
  const body = overrideSchema.safeParse(await request.json().catch(() => null));
  if (!id.success || !body.success) return NextResponse.json({ error: "Invalid outage override." }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const { error } = await supabase.from("outages").update({
    status: body.data.status,
    restored_at: body.data.status === "restored" ? new Date().toISOString() : null,
  }).eq("id", id.data);
  if (error) return NextResponse.json({ error: "The outage status could not be updated." }, { status: 500 });

  // If status was overridden to restored, notify followed users of this area
  if (body.data.status === "restored" && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      );

      const { data: outageData } = await adminClient
        .from("outages")
        .select("area_id, areas(name)")
        .eq("id", id.data)
        .single();

      if (outageData) {
        const areaName = (Array.isArray(outageData.areas)
          ? outageData.areas[0]?.name
          : (outageData.areas as { name: string } | null)?.name) ?? "your area";

        const { data: followers } = await adminClient
          .from("user_areas")
          .select("user_id")
          .eq("area_id", outageData.area_id)
          .eq("notifications_enabled", true);

        if (followers && followers.length > 0) {
          const rows = followers.map((f) => ({
            user_id: f.user_id,
            outage_id: id.data,
            kind: "outage_restored",
            message: `Power appears to be restored in ${areaName}.`,
          }));
          await adminClient.from("notifications").upsert(rows, { onConflict: "user_id,outage_id,kind", ignoreDuplicates: true });
        }
      }
    } catch {
      // Non-blocking: status was already successfully updated
    }
  }

  return NextResponse.json({ ok: true });
}
