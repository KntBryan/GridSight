import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { reportInputSchema } from "@/lib/validation/report";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const maxRequestBytes = 4.5 * 1024 * 1024;
const maxPhotoBytes = 4 * 1024 * 1024;

function numberOrNull(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function matchesImageSignature(bytes: Uint8Array, contentType: string) {
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  if (contentType === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

export async function POST(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Reporting is not configured yet." }, { status: 503 });
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const requestBytes = Number(contentLength);
    if (!Number.isSafeInteger(requestBytes) || requestBytes < 0) {
      return NextResponse.json({ error: "Invalid request size." }, { status: 400 });
    }
    if (requestBytes > maxRequestBytes) {
      return NextResponse.json({ error: "Report request is too large." }, { status: 413 });
    }
  }

  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to submit a report." }, { status: 401 });

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = Redis.fromEnv();
    const limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(6, "1 h"), prefix: "gridsight:reports" });
    const limit = await limiter.limit(user.id);
    if (!limit.success) {
      return NextResponse.json({ error: "Too many reports. Please try again later." }, { status: 429, headers: { "Retry-After": Math.ceil((limit.reset - Date.now()) / 1000).toString() } });
    }
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid report form data." }, { status: 400 });
  }

  const parsed = reportInputSchema.safeParse({
    areaSlug: form.get("areaSlug"),
    status: form.get("status"),
    notes: form.get("notes") ?? "",
    latitude: numberOrNull(form.get("latitude")),
    longitude: numberOrNull(form.get("longitude")),
    requestId: form.get("requestId") || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the report details and try again.", details: parsed.error.flatten() }, { status: 400 });
  }

  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0 && (!allowedPhotoTypes.has(photo.type) || photo.size > maxPhotoBytes)) {
    return NextResponse.json({ error: "Photo must be JPEG, PNG, or WebP and no larger than 4 MB." }, { status: 400 });
  }
  const photoBytes = photo instanceof File && photo.size > 0 ? new Uint8Array(await photo.arrayBuffer()) : null;
  if (photo instanceof File && photoBytes && !matchesImageSignature(photoBytes, photo.type)) {
    return NextResponse.json({ error: "The uploaded file does not match its image type." }, { status: 400 });
  }

  const { data: reportId, error: submitError } = await supabase.rpc("submit_outage_report", {
    p_area_slug: parsed.data.areaSlug,
    p_status: parsed.data.status,
    p_notes: parsed.data.notes || null,
    p_latitude: parsed.data.latitude ?? null,
    p_longitude: parsed.data.longitude ?? null,
    p_request_id: parsed.data.requestId ?? null,
  });
  if (submitError) {
    const cooldown = submitError.message.toLowerCase().includes("cooldown");
    const hourlyLimit = submitError.message.toLowerCase().includes("hourly report limit");
    const outsideBarangay = submitError.message.toLowerCase().includes("inside the selected barangay");
    const rateLimited = cooldown || hourlyLimit;
    return NextResponse.json({
      error: cooldown
        ? "You recently reported this barangay. Please wait a few minutes."
        : hourlyLimit
          ? "You’ve reached the report limit for this hour. Please try again later."
        : outsideBarangay
          ? "Your GPS pin is outside the selected barangay. Choose the barangay containing the pin or clear your location and select one manually."
          : "The report could not be saved.",
    }, { status: rateLimited ? 429 : 400 });
  }

  if (photo instanceof File && photoBytes && reportId) {
    const path = `${user.id}/${reportId}.${extensionByType[photo.type]}`;
    const { error: uploadError } = await supabase.storage.from("report-photos").upload(path, photoBytes, {
      contentType: photo.type,
      upsert: false,
    });
    if (!uploadError) {
      const { error: updateError } = await supabase.from("reports").update({ photo_path: path }).eq("id", reportId).eq("user_id", user.id);
      if (updateError) await supabase.storage.from("report-photos").remove([path]);
    }
  }

  if (process.env.CLUSTER_CRON_SECRET) {
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/functions/v1/cluster-reports`;
    await fetch(functionUrl, {
      method: "POST",
      headers: { "x-cron-secret": process.env.CLUSTER_CRON_SECRET },
      signal: AbortSignal.timeout(1500),
    }).catch(() => undefined);
  }

  return NextResponse.json({ reportId, message: "Report received." }, { status: 201 });
}

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ reports: [] });
  }
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view report history." }, { status: 401 });

  const { data, error } = await supabase.from("reports")
    .select("id, area_id, outage_id, status, verification_status, notes, photo_path, created_at, areas(name, city)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Report history is unavailable." }, { status: 500 });
  return NextResponse.json({ reports: data });
}
