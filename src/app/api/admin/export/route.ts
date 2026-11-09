import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});

type ExportArea = { name: string; city: string };
type ExportOutage = { status: string; first_reported_at: string; restored_at: string | null };

type ExportRow = {
  id: string;
  status: string;
  verification_status: string;
  notes: string | null;
  created_at: string;
  areas: ExportArea | ExportArea[] | null;
  outages: ExportOutage | ExportOutage[] | null;
};

function csvCell(value: unknown) {
  const raw = value == null ? "" : String(value);
  const text = /^[\t\r ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const fromInput = params.get("from");
  const toInput = params.get("to");
  if ((fromInput && !dateSchema.safeParse(fromInput).success) || (toInput && !dateSchema.safeParse(toInput).success)) {
    return NextResponse.json({ error: "Dates must use YYYY-MM-DD format." }, { status: 400 });
  }

  const from = fromInput ? new Date(`${fromInput}T00:00:00.000Z`) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = toInput ? new Date(`${toInput}T23:59:59.999Z`) : new Date();
  if (from > to) return NextResponse.json({ error: "The start date must be before the end date." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const authorization = await requireAdmin(supabase);
  if (!authorization.ok) return authorization.response;

  const { data, error } = await supabase.from("reports")
    .select("id, status, verification_status, notes, created_at, areas(name, city), outages(status, first_reported_at, restored_at)")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .order("created_at", { ascending: false })
    .limit(10000);
  if (error) return NextResponse.json({ error: "Report export failed." }, { status: 500 });

  const rows = (data ?? []) as ExportRow[];
  const header = ["report_id", "area", "city", "report_status", "review_status", "notes", "reported_at", "outage_status", "outage_first_reported_at", "outage_restored_at"];
  const lines = [header.map(csvCell).join(","), ...rows.map((row) => {
    const area = Array.isArray(row.areas) ? row.areas[0] : row.areas;
    const outage = Array.isArray(row.outages) ? row.outages[0] : row.outages;
    return [
      row.id,
      area?.name,
      area?.city,
      row.status,
      row.verification_status,
      row.notes,
      row.created_at,
      outage?.status,
      outage?.first_reported_at,
      outage?.restored_at,
    ].map(csvCell).join(",");
  })];

  return new NextResponse(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gridsight-reports-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
