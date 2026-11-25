import { createBrowserClient } from "@supabase/ssr";
import { authCookieOptions } from "@/lib/supabase/cookie-options";

/**
 * Creates a browser-side Supabase client singleton for client components.
 *
 * @returns {ReturnType<typeof createBrowserClient>} Browser Supabase SSR client instance.
 * @throws {Error} If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not configured.
 *
 * @remarks
 * Uses standard document cookies with durable 30-day max-age options to preserve sessions across mobile app reloads.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are not configured.");
  return createBrowserClient(url, key, {
    cookieOptions: authCookieOptions,
  });
}
