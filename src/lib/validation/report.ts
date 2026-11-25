import { z } from "zod";

/**
 * Validation schema for citizen outage reports.
 *
 * @remarks
 * Validates:
 * - `areaSlug`: Kebab-case barangay slug matching registered coverage areas.
 * - `status`: Power state (`no_power`, `flickering`, or `restored`).
 * - `notes`: Optional commentary capped at 500 characters.
 * - `latitude` / `longitude`: Optional WGS84 coordinate pair (enforces mutual presence).
 * - `requestId`: Optional client-generated UUID for idempotency.
 */
export const reportInputSchema = z.object({
  areaSlug: z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  status: z.enum(["no_power", "flickering", "restored"]),
  notes: z.string().trim().max(500).optional().default(""),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  requestId: z.string().uuid().optional(),
}).refine((value) => (value.latitude == null) === (value.longitude == null), {
  message: "Latitude and longitude must be provided together.",
  path: ["latitude"],
});

/**
 * Inferred TypeScript type for validated citizen outage report inputs.
 */
export type ReportInput = z.infer<typeof reportInputSchema>;
