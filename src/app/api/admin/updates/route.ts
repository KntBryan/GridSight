import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Validation schema for publishing a new official community bulletin or outage advisory.
 */
const createUpdateSchema = z.object({
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(3).max(1200),
  category: z.enum([
    "investigation",
    "restoration_work",
    "power_restored",
    "scheduled_maintenance",
    "advisory",
    "outage_reported",
  ]),
  audience: z.string().trim().min(1).max(100),
  outageId: z.string().uuid().nullable().optional(),
  estimatedTime: z.string().trim().max(80).optional(),
  nextUpdateTime: z.string().trim().max(80).optional(),
});

/**
 * Validation schema for withdrawing an existing bulletin with an explanation.
 */
const withdrawUpdateSchema = z.object({
  updateId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});

/**
 * Retrieves all community updates (published and withdrawn) for administrative review.
 *
 * @returns {Promise<NextResponse>} JSON response containing list of update objects (HTTP 200) or error status.
 *
 * @security Admin - Requires active administrator session and role.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const auth = await requireAdmin(supabase);
  if (!auth.ok) return auth.response;

  const { data, error } = await supabase
    .from("community_updates")
    .select("id, title, message, category, audience, outage_id, estimated_time, next_update_time, state, correction_note, author_name, author_role, published_at, created_at")
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updates: data ?? [] });
}

/**
 * Publishes an official city bulletin or utility restoration advisory.
 *
 * @param request - Next.js HTTP request with update payload conforming to `createUpdateSchema`.
 * @returns {Promise<NextResponse>} JSON response containing inserted bulletin record (HTTP 201) or error status.
 *
 * @security Admin - Requires active administrator session and role.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const auth = await requireAdmin(supabase);
  if (!auth.ok) return auth.response;

  const body = createUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid update data.", issues: body.error.flatten() }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", auth.user.id)
    .maybeSingle();

  const authorName = profile?.name?.trim() || "City Dispatch Staff";

  const { data: inserted, error } = await supabase
    .from("community_updates")
    .insert({
      title: body.data.title,
      message: body.data.message,
      category: body.data.category,
      audience: body.data.audience,
      outage_id: body.data.outageId || null,
      estimated_time: body.data.estimatedTime || null,
      next_update_time: body.data.nextUpdateTime || null,
      author_id: auth.user.id,
      author_name: authorName,
      author_role: "City Staff",
      state: "published",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, update: inserted }, { status: 201 });
}

/**
 * Retracts / withdraws a published community update, appending an auditable correction note.
 *
 * @param request - Next.js HTTP request with `{ updateId, reason }`.
 * @returns {Promise<NextResponse>} JSON response containing the updated record (HTTP 200) or error status.
 *
 * @security Admin - Requires active administrator session and role.
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const auth = await requireAdmin(supabase);
  if (!auth.ok) return auth.response;

  const body = withdrawUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "A reason is required to withdraw an update." }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("community_updates")
    .update({
      state: "withdrawn",
      correction_note: body.data.reason,
      withdrawn_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.data.updateId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, update: updated });
}

