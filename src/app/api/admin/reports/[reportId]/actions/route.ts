import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const actionSchema = z.object({ action: z.enum(["verified", "dismissed"]), reason: z.string().trim().max(300).optional() });

export async function POST(request: NextRequest, { params }: { params: { reportId: string } }) {
  const parsedId = z.string().uuid().safeParse(params.reportId);
  const body = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsedId.success || !body.success) return NextResponse.json({ error: "Invalid moderation action." }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const { error } = await supabase.rpc("moderate_report", {
    p_report_id: parsedId.data,
    p_action: body.data.action,
    p_reason: body.data.reason || null,
  });
  if (error) return NextResponse.json({ error: "The moderation action could not be saved." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
