import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Validation schema for report moderation actions.
 */
const actionSchema = z.object({ action: z.enum(["verified", "dismissed"]), reason: z.string().trim().max(300).optional() });

/**
 * Moderates a citizen outage report (verifying or dismissing).
 *
 * @param request - Next.js HTTP request with JSON payload `{ action, reason? }`.
 * @param params - Route parameters containing the target `reportId` UUID.
 * @returns {Promise<NextResponse>} JSON response indicating success ({ ok: true }) or error status (HTTP 400, 401, 403, 500).
 *
 * @remarks
 * Executes the PostgreSQL `moderate_report` stored procedure, ensuring atomic state
 * updates, verification metrics re-calculation, and audit trail generation.
 *
 * @security Admin - Requires active administrator session and role.
 */
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
