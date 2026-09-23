import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
/** Solo SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_): bypasea RLS. */
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Cliente Supabase con service role para uso en API routes / server.
 * Bypasea RLS. Requiere SUPABASE_SERVICE_ROLE_KEY en .env.local.
 */
export function createServerClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (usa la clave service_role, no la anon)',
    );
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
