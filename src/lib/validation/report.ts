import { z } from "zod";

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

export type ReportInput = z.infer<typeof reportInputSchema>;
