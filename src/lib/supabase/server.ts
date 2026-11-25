import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authCookieOptions } from "@/lib/supabase/cookie-options";

/**
 * Creates an asynchronous server-side Supabase client bound to Next.js cookie headers.
 *
 * @returns {Promise<ReturnType<typeof createServerClient>>} Initialized Supabase SSR client instance.
 * @throws {Error} If `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not configured.
 *
 * @remarks
 * Safely accesses `cookies()` from Next.js server context with 30-day persistent cookie options.
 * Handles read-only constraints during React Server Component (RSC) rendering by catching set errors.
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are not configured.");

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookieOptions: authCookieOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, { ...authCookieOptions, ...options })
          );
        } catch {
          // Route handlers can refresh auth cookies; server component rendering cannot.
        }
      },
    },
  });
}
