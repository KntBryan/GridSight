import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * 30-day persistent cookie options for Supabase authentication.
 * Using a durable maxAge prevents browsers (especially mobile Safari and Chrome)
 * from dropping cookies on browser restart or device power-off.
 */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

export const authCookieOptions: CookieOptionsWithName = {
  maxAge: AUTH_COOKIE_MAX_AGE,
  path: "/",
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
};
