import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Creates a Supabase client for use in Server Components and Server Actions.
 * Uses the anon key + the authenticated user's session cookie for RLS-enforced queries.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll is called from a Server Component — cookies are read-only there.
            // The middleware handles cookie refresh so this is safe to ignore.
          }
        },
      },
    },
  );
}

/**
 * Creates a Supabase admin client using the service role key.
 * Bypasses RLS — only use in Server Components/Actions for operations that require
 * elevated access (e.g., reading a patient's wa_id to send a notification).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
      global: {
        // Opt out of Next.js fetch cache so server components always read fresh data
        fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
      },
    },
  );
}
