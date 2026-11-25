import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { reportInputSchema } from "@/lib/validation/report";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Allowed MIME types for user photo uploads.
 */
const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Extension lookup mapping for validated image MIME types.
 */
const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Maximum permissible request payload size (4.5 MB).
 */
const maxRequestBytes = 4.5 * 1024 * 1024;

/**
 * Maximum permissible single photo upload size (4 MB).
 */
const maxPhotoBytes = 4 * 1024 * 1024;

/**
 * Error thrown when an incoming request exceeds maximum payload size bounds.
 */
class RequestTooLargeError extends Error {}

/**
 * Reads an HTTP request stream up to a strict byte limit to prevent memory exhaustion / DoS attacks.
 *
 * @param request - Incoming Next.js HTTP request.
 * @param maxBytes - Maximum number of allowed bytes.
 * @returns {Promise<Uint8Array>} Raw bytes of the request body.
 * @throws {RequestTooLargeError} If the body stream exceeds `maxBytes`.
 */
async function readBoundedBody(request: NextRequest, maxBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new RequestTooLargeError();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/**
 * Safely parses a form data entry into a finite number or null.
 *
 * @param value - FormData field value or null.
 * @returns {number | null} Parsed number, NaN if invalid string, or null if empty.
 */
function numberOrNull(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

/**
 * Validates file magic numbers / bytes against declared MIME type to prevent extension spoofing.
 *
 * @param bytes - First chunk of binary bytes.
 * @param contentType - Declared MIME content type.
 * @returns {boolean} True if magic bytes match declared image format.
 */
function matchesImageSignature(bytes: Uint8Array, contentType: string) {
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  if (contentType === "image/webp") return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  return false;
}

/**
 * Submits a new citizen power outage observation with optional geotag and photo.
 *
 * @param request - Next.js multipart/form-data request.
 * @returns {Promise<NextResponse>} JSON response with created `reportId` (HTTP 201),
 * or appropriate validation/rate-limit error (HTTP 400, 401, 413, 429, 500, 503).
 *
 * @remarks
 * Workflow:
 * 1. Checks payload size and authenticates the user session.
 * 2. Enforces Upstash sliding-window rate limit (6 reports/hr per user).
 * 3. Reads bounded body and parses form fields (`areaSlug`, `status`, `notes`, GPS coordinates).
 * 4. Inspects photo magic bytes for JPEG/PNG/WebP compliance.
 * 5. Calls database RPC `submit_outage_report`, validating geographic polygon bounds and per-barangay cooldowns.
 * 6. Uploads photo to Supabase storage bucket `report-photos` under `{user_id}/{report_id}.{ext}`.
 * 7. Fires non-blocking background cluster re-calculation trigger via `cluster-reports` Edge Function.
 *
 * @security Authenticated - Requires active Supabase user session.
 */
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

  const supabase = await createSupabaseServerClient();
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
    const body = await readBoundedBody(request, maxRequestBytes);
    form = await new Response(body, { headers: request.headers }).formData();
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      return NextResponse.json({ error: "Report request is too large." }, { status: 413 });
    }
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

  let warning: string | undefined;
  if (photo instanceof File && photoBytes && reportId) {
    const path = `${user.id}/${reportId}.${extensionByType[photo.type]}`;
    const { error: uploadError } = await supabase.storage.from("report-photos").upload(path, photoBytes, {
      contentType: photo.type,
      upsert: false,
    });
    if (uploadError) {
      warning = "Your report was saved, but its photo could not be uploaded.";
    } else {
      const { error: updateError } = await supabase.from("reports").update({ photo_path: path }).eq("id", reportId).eq("user_id", user.id);
      if (updateError) {
        const { error: cleanupError } = await supabase.storage.from("report-photos").remove([path]);
        warning = cleanupError
          ? "Your report was saved, but its photo could not be attached or cleaned up. Contact an administrator."
          : "Your report was saved, but its photo could not be attached.";
      }
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

  return NextResponse.json({
    reportId,
    message: "Report received.",
    ...(warning ? { warning } : {}),
  }, { status: 201 });
}

/**
 * Retrieves the authenticated citizen's personal report history.
 *
 * @returns {Promise<NextResponse>} JSON response containing an array of user reports (HTTP 200),
 * or an error status (HTTP 401, 500, 503).
 *
 * @remarks
 * Orders results by submission timestamp descending, limited to the last 100 entries.
 * Includes joined area names and cities.
 *
 * @security Authenticated - Requires active Supabase user session.
 */
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Reporting is not configured yet." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to view report history." }, { status: 401 });

  const { data, error } = await supabase.from("reports")
    .select("id, area_id, outage_id, status, verification_status, notes, photo_path, created_at, areas(name, city)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "Report history is unavailable." }, { status: 500 });
  return NextResponse.json({ reports: data }, { headers: { "Cache-Control": "private, no-store" } });
}
