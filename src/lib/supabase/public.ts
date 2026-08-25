import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Cookieless anon client for PUBLIC reads and guest booking RPCs.
// Never reads the session, so ISR/static pages stay cacheable — using the
// cookie-bound server client here would silently force dynamic rendering
// (and our try/catch would swallow Next's bailout into empty data).
// RLS still applies: anon sees published content only.
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
