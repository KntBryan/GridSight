import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const actionSchema = z.object({ action: z.enum(["verified", "dismissed"]), reason: z.string().trim().max(300).optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const parsedId = z.string().uuid().safeParse(reportId);
  const body = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsedId.success || !body.success) return NextResponse.json({ error: "Invalid moderation action." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const authorization = await requireAdmin(supabase);
  if (!authorization.ok) return authorization.response;

  const { error } = await supabase.rpc("moderate_report", {
    p_report_id: parsedId.data,
    p_action: body.data.action,
    p_reason: body.data.reason || null,
  });
  if (error) return NextResponse.json({ error: "The moderation action could not be saved." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
