import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
  return NextResponse.json({ ok: true });
}
